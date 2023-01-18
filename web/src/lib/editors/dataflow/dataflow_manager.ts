import type { DataFlowConfig, DataFlowEdge, DataFlowNode } from '$lib/api_types';
import zip from 'just-zip-it';
import { get as getStore, writable } from 'svelte/store';
import type { Box } from '../canvas/drag';
import { toposort_nodes } from 'ergo-wasm';
import camelCase from 'just-camel-case';

/** Metadata used only for the front-end. */
export interface DataFlowNodeMeta {
  id: number;
  position: Box;
  splitPos: number;
  autorun: boolean;
  lastOutput: string;
}

export interface DataFlowSource {
  nodes: DataFlowNodeMeta[];
}

export interface DataFlowManagerNode {
  config: DataFlowNode;
  meta: DataFlowNodeMeta;
}

export interface DataFlowManagerData {
  nodes: DataFlowManagerNode[];
  edges: DataFlowEdge[];
  toposorted: number[];
  nodeIdToIndex: Map<number, number>;
}

export function dataflowManager(config: DataFlowConfig, source: DataFlowSource) {
  const nodes = zip(config?.nodes || [], source?.nodes || []).map(([config, meta]) => {
    return {
      config,
      meta,
    };
  });

  function generateLookups(nodes: DataFlowManagerNode[], edges: DataFlowEdge[]) {
    let nodeIdToIndex = new Map<number, number>(nodes.map((node, i) => [node.meta.id, i]));
    let edgesForSort = edges.map((edge) => ({
      ...edge,
      to: nodeIdToIndex.get(edge.to),
      from: nodeIdToIndex.get(edge.from),
    }));
    let toposorted = toposort_nodes(nodes.length, edgesForSort);
    return { nodeIdToIndex, toposorted };
  }

  // We use the node IDs so it's easier to move things around, but the version on the backend uses indexes.
  let edges = (config?.edges || [])
    .map((edge) => ({
      ...edge,
      from: nodes[edge.from]?.meta.id ?? -1,
      to: nodes[edge.to]?.meta.id ?? -1,
    }))
    .filter((e) => e.from !== -1 && e.to !== -1);

  let lookups = generateLookups(nodes, edges);

  let store = writable({
    nodes,
    edges,
    ...lookups,
  });

  function update(updateFn: (data: DataFlowManagerData) => DataFlowManagerData) {
    store.update((data) => {
      let result = updateFn(data);
      let lookups = generateLookups(result.nodes, result.edges);
      return {
        ...result,
        ...lookups,
      };
    });
  }

  return {
    subscribe: store.subscribe,
    set: store.set,
    update,
    compile(): { compiled: DataFlowConfig; source: DataFlowSource } {
      let data = getStore(store);

      let nodeConfig = data.nodes.map((n) => n.config);
      let nodeSource = data.nodes.map((n) => n.meta);

      // Convert edges back from node IDs to indexes.
      let edges = data.edges
        .map((e) => ({
          ...e,
          from: data.nodeIdToIndex.get(e.from) ?? -1,
          to: data.nodeIdToIndex.get(e.to) ?? -1,
        }))
        .filter((e) => e.from !== -1 && e.to !== -1);

      return {
        compiled: {
          nodes: nodeConfig,
          edges,
          toposorted: data.toposorted,
        },
        source: {
          nodes: nodeSource,
        },
      };
    },
    addEdge(from: number, to: number, edgeName?: string) {
      update((data) => {
        let existingEdge = data.edges.find((e) => e.from === from && e.to === to);
        if (existingEdge) {
          return data;
        }

        if (!data.nodeIdToIndex.has(from)) {
          throw new Error('from node does not exist');
        }
        let toNode = data.nodeIdToIndex.get(to);
        if (toNode === undefined) {
          throw new Error('to node does not exist');
        }

        let name = edgeName;
        if (!name) {
          let node = data.nodes[toNode];
          name = node.config.name;
          if (/[^a-zA-Z0-9]/.test(name)) {
            name = camelCase(name);
          }
        }

        let edges: DataFlowEdge[] = [
          ...data.edges,
          {
            from,
            to,
            name,
          },
        ];

        return {
          ...data,
          edges,
        };
      });
    },
    deleteEdge(from: number, to: number) {
      update((data) => {
        let edges = data.edges.filter((e) => e.from !== from || e.to !== to);
        return {
          ...data,
          edges,
        };
      });
    },
    addNode(box: Box) {
      update((data) => {
        let newNodeIndex = data.nodes.length;
        let newNodeName = `node${newNodeIndex}`;
        while (data.nodes.some((n) => n.config.name === newNodeName)) {
          newNodeIndex += 1;
          newNodeName = `node${newNodeIndex}`;
        }

        let maxId = Math.max(...data.nodes.map((n) => n.meta.id), 0);

        let nodes: DataFlowManagerNode[] = [
          ...data.nodes,
          {
            config: {
              allow_null_inputs: true,
              name: newNodeName,
              func: {
                type: 'js',
                code: '',
                format: 'Expression',
              },
            },
            meta: {
              id: maxId + 1,
              position: box,
              splitPos: 75,
              autorun: true,
              lastOutput: '',
            },
          },
        ];

        return {
          ...data,
          nodes,
        };
      });
    },
    deleteNode(id: number) {
      update((data) => {
        let index = data.nodeIdToIndex.get(id);
        if (typeof index !== 'number') {
          return data;
        }

        let nodeId = data.nodes[index].meta.id;
        let edges = data.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
        let nodes = data.nodes.filter((n) => n.meta.id !== id);

        return {
          ...data,
          edges,
          nodes,
        };
      });
    },
  };
}
