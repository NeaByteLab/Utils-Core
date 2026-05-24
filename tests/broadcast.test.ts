import { assertEquals } from '@std/assert'
import { createBroadcast } from '@neabyte/utils-core'

Deno.test('Broadcast - channels are isolated', () => {
  const bus = createBroadcast()
  const channelA: number[] = []
  const channelB: number[] = []
  bus.on('a', (payloadNumber: number) => channelA.push(payloadNumber))
  bus.on('b', (payloadNumber: number) => channelB.push(payloadNumber))
  bus.emit('a', 1)
  bus.emit('b', 2)
  assertEquals(channelA, [1])
  assertEquals(channelB, [2])
})

Deno.test('Broadcast - clear does not affect other channels', () => {
  const bus = createBroadcast()
  const channelAValues: string[] = []
  const channelBValues: string[] = []
  bus.on('keep', (payloadValue: string) => channelAValues.push(payloadValue))
  bus.on('clear', (payloadValue: string) => channelBValues.push(payloadValue))
  bus.emit('keep', '1')
  bus.emit('clear', '2')
  bus.clear('clear')
  bus.emit('keep', '3')
  bus.emit('clear', '4')
  assertEquals(channelAValues, ['1', '3'])
  assertEquals(channelBValues, ['2'])
})

Deno.test('Broadcast - clear on nonexistent channel is a no-op', () => {
  const bus = createBroadcast()
  bus.clear('never-registered')
  bus.emit('never-registered', 'data')
  let fireCount = 0
  bus.on('never-registered', () => fireCount++)
  bus.emit('never-registered', 'data')
  assertEquals(fireCount, 1)
})

Deno.test('Broadcast - clear removes all listeners for channel', () => {
  const bus = createBroadcast()
  let fireCount = 0
  bus.on('count', () => fireCount++)
  bus.on('count', () => fireCount++)
  bus.emit('count')
  assertEquals(fireCount, 2)
  bus.clear('count')
  bus.emit('count')
  assertEquals(fireCount, 2)
})

Deno.test('Broadcast - clearAll on empty broadcast is a no-op', () => {
  const bus = createBroadcast()
  bus.clearAll()
  let fireCount = 0
  bus.on('post-clear', () => fireCount++)
  bus.emit('post-clear')
  assertEquals(fireCount, 1)
})

Deno.test('Broadcast - clearAll removes all channels', () => {
  const bus = createBroadcast()
  let aCount = 0
  let bCount = 0
  let cCount = 0
  bus.on('a', () => aCount++)
  bus.on('b', () => bCount++)
  bus.on('c', () => cCount++)
  bus.emit('a')
  bus.emit('b')
  bus.emit('c')
  assertEquals(aCount, 1)
  assertEquals(bCount, 1)
  assertEquals(cCount, 1)
  bus.clearAll()
  bus.emit('a')
  bus.emit('b')
  bus.emit('c')
  assertEquals(aCount, 1)
  assertEquals(bCount, 1)
  assertEquals(cCount, 1)
})

Deno.test('Broadcast - createBroadcast instances are fully isolated', () => {
  const busA = createBroadcast()
  const busB = createBroadcast()
  let aCount = 0
  let bCount = 0
  busA.on('shared', () => aCount++)
  busB.on('shared', () => bCount++)
  busA.emit('shared')
  assertEquals(aCount, 1)
  assertEquals(bCount, 0)
  busB.emit('shared')
  assertEquals(aCount, 1)
  assertEquals(bCount, 1)
})

Deno.test('Broadcast - emit on nonexistent channel is a no-op', () => {
  const bus = createBroadcast()
  bus.emit('never-listened')
  let fireCount = 0
  bus.on('never-listened', () => fireCount++)
  assertEquals(fireCount, 0)
  bus.emit('never-listened')
  assertEquals(fireCount, 1)
})

Deno.test('Broadcast - empty channel name', () => {
  const bus = createBroadcast()
  const receivedValues: string[] = []
  bus.on('', (payloadValue: string) => receivedValues.push(payloadValue))
  bus.emit('', 'test')
  assertEquals(receivedValues, ['test'])
})

Deno.test('Broadcast - error isolation', () => {
  const bus = createBroadcast()
  let listenerACount = 0
  let listenerBCount = 0
  bus.on('error-test', () => {
    listenerACount++
    throw new Error('test error')
  })
  bus.on('error-test', () => {
    listenerBCount++
  })
  bus.emit('error-test')
  assertEquals(listenerACount, 1)
  assertEquals(listenerBCount, 1)
})

Deno.test('Broadcast - error isolation routes through onError callback', () => {
  const errorLog: Array<{ message: string; channel: string }> = []
  const bus = createBroadcast({
    onError: (error, _listener, eventName) => {
      errorLog.push({ message: (error as Error).message, channel: eventName })
    }
  })
  bus.on('boom', () => {
    throw new Error('listener-fail')
  })
  bus.emit('boom')
  assertEquals(errorLog.length, 1)
  assertEquals(errorLog[0]?.message, 'listener-fail')
  assertEquals(errorLog[0]?.channel, 'boom')
})

Deno.test('Broadcast - memory cleanup', () => {
  const bus = createBroadcast()
  const channel = 'memory-test'
  for (let i = 0; i < 100; i++) {
    bus.on(channel, () => {})
  }
  bus.clear(channel)
  let fireCount = 0
  bus.on(channel, () => fireCount++)
  bus.emit(channel)
  assertEquals(fireCount, 1)
})

Deno.test('Broadcast - multiple listeners on same channel', () => {
  const bus = createBroadcast()
  const pushedValues: string[] = []
  bus.on('multi', (payloadValue: string) => pushedValues.push(`a:${payloadValue}`))
  bus.on('multi', (payloadValue: string) => pushedValues.push(`b:${payloadValue}`))
  bus.emit('multi', 'x')
  assertEquals(pushedValues, ['a:x', 'b:x'])
})

Deno.test('Broadcast - on and emit work across channels', () => {
  const bus = createBroadcast()
  const receivedMessages: string[] = []
  const unsub = bus.on('msg', (messageData: string) => {
    receivedMessages.push(messageData)
  })
  bus.emit('msg', 'hello')
  bus.emit('msg', 'world')
  assertEquals(receivedMessages, ['hello', 'world'])
  unsub()
})

Deno.test('Broadcast - once cancels via returned unsubscribe before firing', () => {
  const bus = createBroadcast()
  let fireCount = 0
  const cancel = bus.once('cancel-me', () => fireCount++)
  cancel()
  bus.emit('cancel-me')
  bus.emit('cancel-me')
  assertEquals(fireCount, 0)
})

Deno.test('Broadcast - once coexists with on subscribers', () => {
  const bus = createBroadcast()
  let onceCount = 0
  let onCount = 0
  bus.once('mixed', () => onceCount++)
  bus.on('mixed', () => onCount++)
  bus.emit('mixed')
  bus.emit('mixed')
  bus.emit('mixed')
  assertEquals(onceCount, 1)
  assertEquals(onCount, 3)
})

Deno.test('Broadcast - once fires exactly once', () => {
  const bus = createBroadcast()
  let fireCount = 0
  bus.once('one-shot', () => fireCount++)
  bus.emit('one-shot')
  bus.emit('one-shot')
  bus.emit('one-shot')
  assertEquals(fireCount, 1)
})

Deno.test('Broadcast - once preserves payload arguments', () => {
  const bus = createBroadcast()
  const received: Array<[string, number]> = []
  bus.once<[string, number]>('args', (label, value) => {
    received.push([label, value])
  })
  bus.emit<[string, number]>('args', 'hello', 42)
  bus.emit<[string, number]>('args', 'world', 7)
  assertEquals(received, [['hello', 42]])
})

Deno.test('Broadcast - once routes throws through onError', () => {
  const errors: string[] = []
  const bus = createBroadcast({
    onError: (error) => errors.push((error as Error).message)
  })
  bus.once('err', () => {
    throw new Error('once-boom')
  })
  bus.emit('err')
  bus.emit('err')
  assertEquals(errors, ['once-boom'])
})

Deno.test('Broadcast - special characters in channel names', () => {
  const bus = createBroadcast()
  const channels = ['test@#$%', 'unicode-日本語', 'spaces in name', 'tab\there']
  const channelResults: Record<string, string> = {}
  channels.forEach((channelName) => {
    bus.on(channelName, (payloadValue: string) => {
      channelResults[channelName] = payloadValue
    })
  })
  channels.forEach((channelName) => {
    bus.emit(channelName, `data-${channelName}`)
  })
  channels.forEach((channelName) => {
    assertEquals(channelResults[channelName], `data-${channelName}`)
  })
})

Deno.test('Broadcast - stress test with 100 channels', () => {
  const bus = createBroadcast()
  const emitResults: Record<string, number> = {}
  for (let i = 0; i < 100; i++) {
    const channel = `ch-${i}`
    emitResults[channel] = 0
    bus.on(channel, () => {
      emitResults[channel] = (emitResults[channel] ?? 0) + 1
    })
  }
  for (let i = 0; i < 100; i++) {
    bus.emit(`ch-${i}`, i)
  }
  for (let i = 0; i < 100; i++) {
    assertEquals(emitResults[`ch-${i}`], 1)
  }
})

Deno.test('Broadcast - stress test with 10000 rapid emits', () => {
  const bus = createBroadcast()
  const channel = 'rapid-channel'
  let fireCount = 0
  bus.on(channel, () => fireCount++)
  for (let i = 0; i < 10000; i++) {
    bus.emit(channel, i)
  }
  assertEquals(fireCount, 10000)
})

Deno.test('Broadcast - stress test with 500 listeners on one channel', () => {
  const bus = createBroadcast()
  const channel = 'stress-channel'
  const listenerCounts = new Array(500).fill(0)
  listenerCounts.map((_, i) =>
    bus.on(channel, () => {
      listenerCounts[i] = (listenerCounts[i] ?? 0) + 1
    })
  )
  for (let i = 0; i < 50; i++) {
    bus.emit(channel, i)
  }
  assertEquals(
    listenerCounts.every((listenerCount) => listenerCount === 50),
    true
  )
  assertEquals(
    listenerCounts.reduce((sum, addend) => sum + addend, 0),
    25000
  )
})

Deno.test('Broadcast - unsubscribe stops receiving', () => {
  const bus = createBroadcast()
  const receivedValues: string[] = []
  const unsub = bus.on('test', (payloadValue: string) => receivedValues.push(payloadValue))
  bus.emit('test', 'first')
  assertEquals(receivedValues, ['first'])
  unsub()
  bus.emit('test', 'second')
  assertEquals(receivedValues, ['first'])
})
