/**
 * replicate Neo.VM.RandomAccessStack.js
 * @type {*}
 */
let Exception = require(__dirname + "/Exception.js");
let Base = require(__dirname + "/Base.js");

class RandomAccessStack extends Base {
  constructor() {
    super();

    this.Debug('RandomAccessStack()');
    this.list = [];
  }

  Count() {
    this.Debug('RandomAccessStack.Count() length: %d', this.list.length);
    return this.list.length;
  }

  // don't think this is needed in js version - always iterating over the list..?
  // GetEnumerator() {
  //   this.Debug('RandomAccessStack.GetEnumerator()');
  // }
  Clear() {
    this.Debug('RandomAccessStack.Clear()');
    this.list = [];
  }

  //C# Params: int index, T item
  Insert(index, item) {
    this.Debug('RandomAccessStack.Insert(%s, %s)', index, item);
    if (index > this.Count()) {
      throw new Exception('InvalidOperationException', 'index > list.Count');
    }

    this.list.splice(index, 0, item);
  }

  //C# Params: int index = 0
  Peek(index = 0) {
    this.Debug('RandomAccessStack.Peek(%s)', index);
    if (index >= this.Count()) {
      throw new Exception('InvalidOperationException', 'index >= list.Count');
    }

    return this.list[this.Count() - 1 - index];
  }

  Pop() {
    this.Debug('RandomAccessStack.Pop()');

    return this.Remove(0);
  }

  //C# Params: T item
  Push(item) {
    this.Debug('RandomAccessStack.Push()');

    this.list.push(item);
  }

  //C# Params: int index
  Remove(index) {
    this.Debug('RandomAccessStack.Remove(%s)', index);
    if (index >= this.Count()) {
      throw new Exception('InvalidOperationException', 'index >= list.Count');
    }

    return this.list.splice(this.Count() - index - 1, 1)[0];
  }

  //C# Params: int index, T item
  Set(index, item) {
    this.Debug('RandomAccessStack.Set(%s, %s)', index, item);
    if (index >= this.Count()) {
      throw new Exception('InvalidOperationException', 'index >= list.Count');
    }

    this.list[this.Count() - index - 1] = item;
  }
}

module.exports = RandomAccessStack;