let RandomAccessStack = require(__dirname + "/RandomAccessStack.js");
let Base = require(__dirname + "/Base.js");

class ExecutionEngine extends Base {
//C# Params: IScriptContainer container, ICrypto crypto, IScriptTable table = null, InteropService service = null
  constructor(container, crypto, table = null, service = null) {
    super();

    console.log('ExecutionEngine(%s, %s, %s, %s)', container, crypto, table, service);

    this.InvocationStack = new RandomAccessStack(); // T<ExecutionContext>
    this.EvaluationStack = new RandomAccessStack(); // T<StackItem>
    this.AltStack = new RandomAccessStack();        // T<StackItem>

    console.log('setting up eval stack');
    console.log(this.EvaluationStack);
  }

  //C# Params: uint position
  AddBreakPoint(position) {
    console.log('ExecutionEngine.AddBreakPoint(%s)', position);
  }

  Dispose() {
    console.log('ExecutionEngine.Dispose()');
  }

  Execute() {
    console.log('ExecutionEngine.Execute()');
  }

  ExecuteOp(opcode, context) {
    console.log('ExecutionEngine.ExecuteOp(%s, %s)', opcode, context);
  }

  LoadScript(script, push_only = false) {
    console.log('ExecutionEngine.LoadScript(%s, %s)', script, push_only);
  }

  RemoveBreakPoint(position) {
    console.log('ExecutionEngine.RemoveBreakPoint(%s)', position);
  }

  StepInto() {
    console.log('ExecutionEngine.StepInto()');
  }

  StepOut() {
    console.log('ExecutionEngine.StepOut()');
  }

  StepOver() {
    console.log('ExecutionEngine.StepOver()');
  }
}

module.exports = ExecutionEngine;