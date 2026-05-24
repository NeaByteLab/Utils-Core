import { assertEquals, assertThrows } from '@std/assert'
import { createStore } from '@neabyte/utils-core'

Deno.test('Store - batch defers single notification for multiple setState calls', () => {
  const store = createStore(0)
  let notifyCount = 0
  let lastSeen = -1
  store.subscribe(() => {
    notifyCount++
    lastSeen = store.getState()
  })
  store.batch(() => {
    store.setState((currentValue) => currentValue + 1)
    store.setState((currentValue) => currentValue + 1)
    store.setState((currentValue) => currentValue + 1)
  })
  assertEquals(notifyCount, 1)
  assertEquals(lastSeen, 3)
  assertEquals(store.getState(), 3)
})

Deno.test('Store - batch exception still notifies of recorded changes and resets state', () => {
  const store = createStore(0)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  try {
    store.batch(() => {
      store.setState(() => 1)
      throw new Error('mid-batch')
    })
  } catch (caught) {
    assertEquals((caught as Error).message, 'mid-batch')
  }
  assertEquals(notifyCount, 1)
  assertEquals(store.getState(), 1)
  store.setState(() => 2)
  assertEquals(notifyCount, 2)
  assertEquals(store.getState(), 2)
})

Deno.test('Store - batch nested batches collapse into one notification', () => {
  const store = createStore(0)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.batch(() => {
    store.setState((currentValue) => currentValue + 1)
    store.batch(() => {
      store.setState((currentValue) => currentValue + 1)
      store.batch(() => {
        store.setState((currentValue) => currentValue + 1)
      })
      store.setState((currentValue) => currentValue + 1)
    })
    store.setState((currentValue) => currentValue + 1)
  })
  assertEquals(notifyCount, 1)
  assertEquals(store.getState(), 5)
})

Deno.test('Store - batch nested exception in inner batch still flushes outer', () => {
  const store = createStore(0)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  try {
    store.batch(() => {
      store.setState((currentValue) => currentValue + 1)
      store.batch(() => {
        store.setState((currentValue) => currentValue + 1)
        throw new Error('inner')
      })
    })
  } catch (caught) {
    assertEquals((caught as Error).message, 'inner')
  }
  assertEquals(notifyCount, 1)
  assertEquals(store.getState(), 2)
})

Deno.test('Store - batch no notification when no actual change occurred', () => {
  const store = createStore(5)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.batch(() => {
    store.setState((currentValue) => currentValue)
    store.setState((currentValue) => currentValue)
  })
  assertEquals(notifyCount, 0)
})

Deno.test('Store - batch onChange still fires per individual setState', () => {
  const changes: Array<{ prev: number; next: number }> = []
  const store = createStore(0, {
    onChange: ({ newState, oldState }) => changes.push({ prev: oldState, next: newState })
  })
  store.batch(() => {
    store.setState(() => 1)
    store.setState(() => 2)
    store.setState(() => 3)
  })
  assertEquals(changes, [
    { prev: 0, next: 1 },
    { prev: 1, next: 2 },
    { prev: 2, next: 3 }
  ])
})

Deno.test('Store - batch reset inside batch defers notification', () => {
  const store = createStore(0)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.setState(() => 100)
  notifyCount = 0
  store.batch(() => {
    store.setState((currentValue) => currentValue + 1)
    store.reset()
  })
  assertEquals(notifyCount, 1)
  assertEquals(store.getState(), 0)
})

Deno.test('Store - batch throws on non-function argument', () => {
  const store = createStore(0)
  assertThrows(() => store.batch(null as unknown as () => void), TypeError)
  assertThrows(() => store.batch(42 as unknown as () => void), TypeError)
})

Deno.test('Store - batch with empty function does not notify', () => {
  const store = createStore(0)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.batch(() => {})
  assertEquals(notifyCount, 0)
})

Deno.test('Store - batch with setState that reverts back to prev still notifies once', () => {
  const store = createStore(0)
  let notifyCount = 0
  let lastSeen = -1
  store.subscribe(() => {
    notifyCount++
    lastSeen = store.getState()
  })
  store.batch(() => {
    store.setState(() => 1)
    store.setState(() => 0)
  })
  assertEquals(notifyCount, 1)
  assertEquals(lastSeen, 0)
})

Deno.test('Store - custom isEqual prevents redundant notifications', () => {
  const store = createStore({ id: 1, name: 'one' }, {
    isEqual: (prev, next) => prev.id === next.id
  })
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.setState(() => ({ id: 1, name: 'changed' }))
  assertEquals(notifyCount, 0)
  store.setState(() => ({ id: 2, name: 'changed' }))
  assertEquals(notifyCount, 1)
})

Deno.test('Store - custom isEqual throw propagates and skips notification', () => {
  const store = createStore(0, {
    isEqual: () => {
      throw new Error('eq-fail')
    }
  })
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  try {
    store.setState(() => 5)
  } catch (caught) {
    assertEquals((caught as Error).message, 'eq-fail')
  }
  assertEquals(notifyCount, 0)
  assertEquals(store.getState(), 0)
})

Deno.test('Store - error isolation', () => {
  const store = createStore(0)
  let subscriberACount = 0
  let subscriberBCount = 0
  store.subscribe(() => {
    subscriberACount++
    throw new Error('test error')
  })
  store.subscribe(() => {
    subscriberBCount++
  })
  store.setState((currentValue) => currentValue + 1)
  assertEquals(subscriberACount, 1)
  assertEquals(subscriberBCount, 1)
})

Deno.test('Store - getState returns initial value', () => {
  const store = createStore({ count: 0, name: 'test' })
  assertEquals(store.getState(), { count: 0, name: 'test' })
})

Deno.test('Store - listener throw with no onError continues notifying others', () => {
  const store = createStore(0)
  store.subscribe(() => {
    throw new Error('first-fail')
  })
  let secondCount = 0
  let thirdCount = 0
  store.subscribe(() => secondCount++)
  store.subscribe(() => thirdCount++)
  store.setState(() => 1)
  assertEquals(secondCount, 1)
  assertEquals(thirdCount, 1)
})

Deno.test('Store - multiple subscribers all notified', () => {
  const store = createStore(0)
  const subscriberCounts: [number, number, number] = [0, 0, 0]
  store.subscribe(() => subscriberCounts[0]++)
  store.subscribe(() => subscriberCounts[1]++)
  store.subscribe(() => subscriberCounts[2]++)
  store.setState((currentValue) => currentValue + 1)
  assertEquals(subscriberCounts, [1, 1, 1])
})

Deno.test('Store - nested setState', () => {
  const store = createStore(0)
  const stateValues: number[] = []
  store.subscribe(() => {
    stateValues.push(store.getState())
    if (store.getState() === 1) {
      store.setState((currentValue) => currentValue + 1)
    }
  })
  store.setState((currentValue) => currentValue + 1)
  assertEquals(stateValues, [1, 2])
  assertEquals(store.getState(), 2)
})

Deno.test('Store - no notification when value unchanged', () => {
  const store = createStore(5)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.setState((currentValue) => currentValue)
  assertEquals(notifyCount, 0)
})

Deno.test('Store - onChange callback receives prev and new state', () => {
  const stateChanges: Array<{ prev: number; next: number }> = []
  const store = createStore(0, {
    onChange: ({ newState, oldState }) => {
      stateChanges.push({ prev: oldState, next: newState })
    }
  })
  store.setState(() => 10)
  store.setState(() => 20)
  assertEquals(stateChanges.length, 2)
  assertEquals(stateChanges[0], { prev: 0, next: 10 })
  assertEquals(stateChanges[1], { prev: 10, next: 20 })
})

Deno.test('Store - onChange prev and next values', () => {
  const stateChanges: Array<{ prev: number; next: number }> = []
  const store = createStore(0, {
    onChange: ({ newState, oldState }) => {
      stateChanges.push({ prev: oldState, next: newState })
    }
  })
  store.setState((currentValue) => currentValue + 1)
  store.setState((currentValue) => currentValue + 1)
  assertEquals(stateChanges, [
    { prev: 0, next: 1 },
    { prev: 1, next: 2 }
  ])
})

Deno.test('Store - onError absence still isolates listener errors', () => {
  const store = createStore(0)
  store.subscribe(() => {
    throw new Error('silent-fail')
  })
  let secondCount = 0
  store.subscribe(() => secondCount++)
  store.setState((currentValue) => currentValue + 1)
  assertEquals(secondCount, 1)
})

Deno.test('Store - onError captures listener throws with the listener reference', () => {
  const captured: Array<{ message: string; matchesListener: boolean }> = []
  const failingListener = () => {
    throw new Error('listener-fail')
  }
  const store = createStore(0, {
    onError: (error, listener) => {
      captured.push({
        message: (error as Error).message,
        matchesListener: listener === failingListener
      })
    }
  })
  store.subscribe(failingListener)
  store.setState((currentValue) => currentValue + 1)
  assertEquals(captured.length, 1)
  assertEquals(captured[0]?.message, 'listener-fail')
  assertEquals(captured[0]?.matchesListener, true)
})

Deno.test('Store - reset is a no-op when state already equals initial', () => {
  const initial = { count: 0 }
  const store = createStore(initial)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.reset()
  assertEquals(notifyCount, 0)
  assertEquals(store.getState(), initial)
})

Deno.test('Store - reset notifies subscribers when state changed', () => {
  const store = createStore('initial')
  const seen: string[] = []
  store.subscribe(() => seen.push(store.getState()))
  store.setState(() => 'changed')
  store.reset()
  assertEquals(seen, ['changed', 'initial'])
})

Deno.test('Store - reset restores reference of initial state', () => {
  const initial = { value: 1 }
  const store = createStore(initial)
  store.setState(() => ({ value: 2 }))
  store.reset()
  assertEquals(store.getState() === initial, true)
})

Deno.test('Store - reset returns to initial value', () => {
  const store = createStore(10)
  store.setState(() => 99)
  assertEquals(store.getState(), 99)
  store.reset()
  assertEquals(store.getState(), 10)
})

Deno.test('Store - reset throws if setState updater somehow throws (defense)', () => {
  const initial = { v: 1 }
  const store = createStore(initial, {
    isEqual: () => false
  })
  store.setState(() => ({ v: 2 }))
  store.reset()
  assertEquals(store.getState() === initial, true)
})

Deno.test('Store - setState updater returning prev value skips notification', () => {
  const initial = { value: 'unchanged' }
  const store = createStore(initial)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  store.setState((prev) => prev)
  assertEquals(notifyCount, 0)
  assertEquals(store.getState() === initial, true)
})

Deno.test('Store - setState updater throw leaves state unchanged and no notification', () => {
  const store = createStore(10)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  try {
    store.setState(() => {
      throw new Error('updater-fail')
    })
  } catch (caught) {
    assertEquals((caught as Error).message, 'updater-fail')
  }
  assertEquals(store.getState(), 10)
  assertEquals(notifyCount, 0)
})

Deno.test('Store - setState updates value', () => {
  const store = createStore(10)
  store.setState((currentValue) => currentValue + 5)
  assertEquals(store.getState(), 15)
})

Deno.test('Store - stress test with 10000 rapid updates', () => {
  const store = createStore(0)
  let notifyCount = 0
  store.subscribe(() => notifyCount++)
  for (let i = 0; i < 10000; i++) {
    store.setState((currentValue) => currentValue + 1)
  }
  assertEquals(notifyCount, 10000)
  assertEquals(store.getState(), 10000)
})

Deno.test('Store - stress test with 500 subscribers', () => {
  const store = createStore(0)
  const subscriberNotifyCounts: number[] = new Array(500).fill(0)
  const unsubscribeFns = subscriberNotifyCounts.map((_, i) =>
    store.subscribe(() => {
      subscriberNotifyCounts[i] = (subscriberNotifyCounts[i] || 0) + 1
    })
  )
  for (let i = 0; i < 100; i++) {
    store.setState((currentValue) => currentValue + 1)
  }
  assertEquals(
    subscriberNotifyCounts.every((notifyCount) => notifyCount === 100),
    true
  )
  assertEquals(
    subscriberNotifyCounts.reduce((sum, addend) => sum + addend, 0),
    50000
  )
  unsubscribeFns.forEach((unsubscribeFn) => unsubscribeFn())
})

Deno.test('Store - subscribe during notify does not fire new listener in same cycle', () => {
  const store = createStore(0)
  let primaryCount = 0
  let dynamicCount = 0
  store.subscribe(() => {
    primaryCount++
    if (primaryCount === 1) {
      store.subscribe(() => {
        dynamicCount++
      })
    }
  })
  store.setState(() => 1)
  assertEquals(primaryCount, 1)
  assertEquals(dynamicCount, 0)
  store.setState(() => 2)
  assertEquals(primaryCount, 2)
  assertEquals(dynamicCount, 1)
})

Deno.test('Store - subscribe notifies on change', () => {
  const store = createStore('initial')
  const notifiedStates: string[] = []
  store.subscribe(() => {
    notifiedStates.push(store.getState())
  })
  store.setState(() => 'changed')
  assertEquals(notifiedStates, ['changed'])
})

Deno.test('Store - throws when setState receives non-function', () => {
  const store = createStore(0)
  assertThrows(() => store.setState(null as unknown as (currentValue: number) => number), TypeError)
  assertThrows(() => store.setState(42 as unknown as (currentValue: number) => number), TypeError)
})

Deno.test('Store - unsubscribe stops notifications', () => {
  const store = createStore(0)
  let notifyCount = 0
  const unsub = store.subscribe(() => notifyCount++)
  store.setState((currentValue) => currentValue + 1)
  assertEquals(notifyCount, 1)
  unsub()
  store.setState((currentValue) => currentValue + 1)
  assertEquals(notifyCount, 1)
})
