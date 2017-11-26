let Exception = require(__dirname + "/Exception.js");

let ExecutionEngine = require(__dirname + "/ExecutionEngine.js");
let util = require('util');

class ApplicationEngine extends ExecutionEngine {
//C# Params: TriggerType trigger, IScriptContainer container, IScriptTable table, InteropService service, Fixed8 gas, bool testMode = false
  constructor(trigger, container, table, service, gas, testMode) {
    let crypto = 'crypto';
    super(container, crypto, table, service);

    this.Debug('ApplicationEngine(%s, %s, %s, %s, %s, %s)', trigger, container, table, service, gas, testMode);

    this.ratio = 100000;
    this.gas_free = 10 * 100000000;
    this.gas_consumed = 0;

    this.gas_amount = this.gas_free + gas;
    this.testMode = testMode;
    this.Trigger = trigger; // trigger.Type?
  }

  //C# Params: OpCode nextInstruction
  CheckArraySize(nextInstruction) {
    this.Debug('ApplicationEngine.CheckArraySize(%o)', nextInstruction);
    this.Debug('ratio: %s', this.ratio);
    switch (nextInstruction) {
      case this.opCodes.PACK:
      case this.opCodes.NEWARRAY:

    }
  }

  //C# Params: OpCode nextInstruction
  CheckInvocationStack(nextInstruction) {
    this.Debug('ApplicationEngine.CheckInvocationStack(%s)', nextInstruction);
  }

  //C# Params: OpCode nextInstruction
  CheckItemSize(nextInstruction) {
    this.Debug('ApplicationEngine.CheckItemSize(%s)', nextInstruction);
  }

  //C# Params: BigInteger value
  CheckBigInteger(value) {
    this.Debug('ApplicationEngine.CheckBigInteger(%s)', value);
  }

  //C# Params: OpCode nextInstruction
  CheckBigIntegers(nextInstruction) {
    this.Debug('ApplicationEngine.CheckBigIntegers(%s)', nextInstruction);
  }

  //C# Params: OpCode nextInstruction
  CheckStackSize(nextInstruction) {
    this.Debug('ApplicationEngine.CheckStackSize(%s)', nextInstruction);
  }

  Execute() {
    this.Debug('ApplicationEngine.Execute()');
  }

  //C# Params: OpCode nextInstruction
  GetPrice(nextInstruction) {
    this.Debug('ApplicationEngine.GetPrice(%s)', nextInstruction);
  }

  GetPriceForSysCall() {
    this.Debug('ApplicationEngine.GetPriceForSysCall()');
  }

  //C# Params: byte[] script, IScriptContainer container = null
  Run(script, container) {
    this.Debug('ApplicationEngine.Run(%s, %s)', script, container);
    /*
    DataCache<UInt160, AccountState> accounts = Blockchain.Default.CreateCache<UInt160, AccountState>();
    DataCache<ECPoint, ValidatorState> validators = Blockchain.Default.CreateCache<ECPoint, ValidatorState>();
    DataCache<UInt256, AssetState> assets = Blockchain.Default.CreateCache<UInt256, AssetState>();
    DataCache<UInt160, ContractState> contracts = Blockchain.Default.CreateCache<UInt160, ContractState>();
    DataCache<StorageKey, StorageItem> storages = Blockchain.Default.CreateCache<StorageKey, StorageItem>();
    CachedScriptTable script_table = new CachedScriptTable(contracts);
    StateMachine service = new StateMachine(accounts, validators, assets, contracts, storages);
    ApplicationEngine engine = new ApplicationEngine(TriggerType.Application, container, script_table, service, Fixed8.Zero, true);
    engine.LoadScript(script, false);
    engine.Execute();
    return engine;

     */
  }
}

module.exports = ApplicationEngine;
