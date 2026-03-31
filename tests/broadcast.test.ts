import { assertEquals } from '@std/assert'
import { broadcast } from '@neabyte/utils-core'

Deno.test('Broadcast - channels are isolated', () => {
  const channelA: number[] = []
  const channelB: number[] = []
  broadcast.on('a', (n: number) => channelA.push(n))
  broadcast.on('b', (n: number) => channelB.push(n))
  broadcast.emit('a', 1)
  broadcast.emit('b', 2)
  assertEquals(channelA, [1])
  assertEquals(channelB, [2])
})

Deno.test('Broadcast - clear does not affect other channels', () => {
  const aValues: string[] = []
  const bValues: string[] = []
  broadcast.on('keep', (v: string) => aValues.push(v))
  broadcast.on('clear', (v: string) => bValues.push(v))
  broadcast.emit('keep', '1')
  broadcast.emit('clear', '2')
  broadcast.clear('clear')
  broadcast.emit('keep', '3')
  broadcast.emit('clear', '4')
  assertEquals(aValues, ['1', '3'])
  assertEquals(bValues, ['2'])
})

Deno.test('Broadcast - clear removes all listeners for channel', () => {
  let count = 0
  broadcast.on('count', () => count++)
  broadcast.on('count', () => count++)
  broadcast.emit('count')
  assertEquals(count, 2)
  broadcast.clear('count')
  broadcast.emit('count')
  assertEquals(count, 2)
})

Deno.test('Broadcast - empty channel name', () => {
  const values: string[] = []
  broadcast.on('', (v: string) => values.push(v))
  broadcast.emit('', 'test')
  assertEquals(values, ['test'])
  broadcast.clear('')
})

Deno.test('Broadcast - error isolation', () => {
  let countA = 0
  let countB = 0
  broadcast.on('error-test', () => {
    countA++
    throw new Error('test error')
  })
  broadcast.on('error-test', () => {
    countB++
  })
  broadcast.emit('error-test')
  assertEquals(countA, 1)
  assertEquals(countB, 1)
  broadcast.clear('error-test')
})

Deno.test('Broadcast - memory cleanup', () => {
  const channel = 'memory-test'
  for (let i = 0; i < 100; i++) {
    broadcast.on(channel, () => {})
  }
  broadcast.clear(channel)
  let count = 0
  broadcast.on(channel, () => count++)
  broadcast.emit(channel)
  assertEquals(count, 1)
  broadcast.clear(channel)
})

Deno.test('Broadcast - multiple listeners on same channel', () => {
  const values: string[] = []
  broadcast.on('multi', (v: string) => values.push(`a:${v}`))
  broadcast.on('multi', (v: string) => values.push(`b:${v}`))
  broadcast.emit('multi', 'x')
  assertEquals(values, ['a:x', 'b:x'])
})

Deno.test('Broadcast - on and emit work across channels', () => {
  const messages: string[] = []
  const unsub = broadcast.on('msg', (data: string) => {
    messages.push(data)
  })
  broadcast.emit('msg', 'hello')
  broadcast.emit('msg', 'world')
  assertEquals(messages, ['hello', 'world'])
  unsub()
})

Deno.test('Broadcast - special characters in channel names', () => {
  const channels = ['test@#$%', 'unicode-日本語', 'spaces in name', 'tab\there']
  const results: Record<string, string> = {}
  channels.forEach((ch) => {
    broadcast.on(ch, (v: string) => {
      results[ch] = v
    })
  })
  channels.forEach((ch) => {
    broadcast.emit(ch, `data-${ch}`)
  })
  channels.forEach((ch) => {
    assertEquals(results[ch], `data-${ch}`)
    broadcast.clear(ch)
  })
})

Deno.test('Broadcast - stress test with 100 channels', () => {
  const results: Record<string, number> = {}
  for (let i = 0; i < 100; i++) {
    const channel = `ch-${i}`
    results[channel] = 0
    broadcast.on(channel, () => {
      results[channel] = (results[channel] ?? 0) + 1
    })
  }
  for (let i = 0; i < 100; i++) {
    broadcast.emit(`ch-${i}`, i)
  }
  for (let i = 0; i < 100; i++) {
    assertEquals(results[`ch-${i}`], 1)
  }
  for (let i = 0; i < 100; i++) {
    broadcast.clear(`ch-${i}`)
  }
})

Deno.test('Broadcast - stress test with 10000 rapid emits', () => {
  const channel = 'rapid-channel'
  let count = 0
  broadcast.on(channel, () => count++)
  for (let i = 0; i < 10000; i++) {
    broadcast.emit(channel, i)
  }
  assertEquals(count, 10000)
  broadcast.clear(channel)
})

Deno.test('Broadcast - stress test with 500 listeners on one channel', () => {
  const channel = 'stress-channel'
  const counts = new Array(500).fill(0)
  const unsubs = counts.map((_, i) =>
    broadcast.on(channel, () => {
      counts[i] = (counts[i] ?? 0) + 1
    })
  )
  for (let i = 0; i < 50; i++) {
    broadcast.emit(channel, i)
  }
  assertEquals(
    counts.every((c) => c === 50),
    true
  )
  assertEquals(
    counts.reduce((a, b) => a + b, 0),
    25000
  )
  unsubs.forEach((u) => u())
  broadcast.clear(channel)
})

Deno.test('Broadcast - unsubscribe stops receiving', () => {
  const values: string[] = []
  const unsub = broadcast.on('test', (v: string) => values.push(v))
  broadcast.emit('test', 'first')
  assertEquals(values, ['first'])
  unsub()
  broadcast.emit('test', 'second')
  assertEquals(values, ['first'])
})
