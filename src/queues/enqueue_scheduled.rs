use chrono::{DateTime, Utc};
use deadpool_redis::ConnectionWrapper;
use redis::Script;

use crate::error::Error;

use super::Queue;

// KEYS:
//  1. scheduled items list
//  2. pending items list
// ARGV:
//  1. current time
const ENQUEUE_SCHEDULED_SCRIPT: &str = r##"
    local move_items = redis.call('ZRANGEBYSCORE', KEYS[1], 0, ARGV[1])
    if #move_items == 0 then
        return 0
    end

    redis.call('ZREM', KEYS[1], unpack(move_items))
    redis.call('LPUSH', KEYS[2], unpack(move_items))
    return #move_items
"##;

pub struct EnqueueScript(redis::Script);

impl EnqueueScript {
    pub fn new() -> Self {
        EnqueueScript(redis::Script::new(ENQUEUE_SCHEDULED_SCRIPT))
    }

    pub async fn run(
        &self,
        queue: &Queue,
        conn: &mut ConnectionWrapper,
        now: &DateTime<Utc>,
    ) -> Result<usize, Error> {
        let items_enqueued: usize = self
            .0
            .key(&queue.0.scheduled_list)
            .key(&queue.0.pending_list)
            .arg(now.timestamp_millis() as i64)
            .invoke_async(&mut **conn)
            .await?;

        Ok(items_enqueued)
    }
}
