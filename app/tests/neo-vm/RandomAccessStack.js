/* global describe it */

const assert = require('chai').assert;
const RandomAccessStack = require('../../../app/libs/neo-vm/RandomAccessStack.js');

describe(`RandomAccessStack.js`, () => {
  let stack = new RandomAccessStack();
  stack.Logging(false);

  it("init()", (done) => {
    assert(typeof(stack) === 'object', 'stack object init failed');
    assert(stack.Count() === 0, 'stack.Count() !== 0');
    done();
  });

  it("Push()", (done) => {
    // push 'test1' onto the stack
    stack.Push('test1');
    assert(stack.Count() === 1, 'stack.Count() !== 1');
    done();
  });

  it("Insert()", (done) => {
    // insert test0 at the front of the stack (position 0)
    stack.Insert(0, 'test0');
    stack.Insert(2, 'test2');
    assert(stack.Count() === 3, 'stack.Count() !== 3');
    done();
  });

  it("Peek()", (done) => {
    // peek at the top of the stack (which is really the end of the stack)
    assert(stack.Peek() === 'test2', 'Peek() was not test2');
    assert(stack.Peek(0) === 'test2', 'Peek(0) was not test2');
    assert(stack.Peek(1) === 'test1', 'Peek(1) was not test1');
    assert(stack.Peek(2) === 'test0', 'Peek(2) was not test0');
    done();
  });

  it("Pop()", (done) => {
    // popped value should be the first element on the stack to be processed
    const poppedValue = stack.Pop();
    assert(stack.Count() === 2, 'stack.Count() !== 2');
    assert(poppedValue === 'test2', 'poppedValue !== test2');
    done();
  });

  it("Remove()", (done) => {
    const returnValue = stack.Remove(0);
    // the next item on the stack should be 'test1'
    assert(returnValue === 'test1', 'Remove(0) failed to remove top of stack');
    assert(stack.Count() === 1, 'stack.Count() !== 1');
    done();
  });

  it("Set()", (done) => {
    stack.Push('testA');
    // already tested Push but.. why not test again
    assert(stack.Peek(0) === 'testA', 'stack.Push() failed in Set() test');
    stack.Set(0, 'testB');
    assert(stack.Peek(0) === 'testB', 'stack.Set() failed');
    done();
  });

  it("Count()", (done) => {
    assert(stack.Count() === 2, 'Count() incorrect');
    done();
  });

  it("Clear()", (done) => {
    stack.Clear();
    assert(stack.Count() === 0, 'Clear() failed');
    done();
  });

});