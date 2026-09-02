// Thin wrapper over Kafka/SNS - swap the implementation without touching callers.
export async function publishEvent(topic: string, payload: Record<string, unknown>): Promise<void> {
  // e.g. await kafkaProducer.send({ topic, messages: [{ value: JSON.stringify(payload) }] })
  console.log(`[event-bus] ${topic}`, payload);
}
