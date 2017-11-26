/**
 *
 * NEO javascript bytecode compiler
 *
 * birmas <birmingh@gmail.com> - beer fund: AcYFKVerLZbAVFYRV5Yr24587rGjHdz7SK ;-)
 *
 * https://github.com/CityOfZion
 * https://github.com/birmas/
 *
 * usage: window.neoJSEngine.parse(jsSource);
 *
 * this is very much a work in progress and is not intended to be a fully functional neo bytecode compiler (yet!)
 * short term todo:
 *  - implement arithmetic operations for variables
 *  - implement support for neo framework calls
 *  - implement appcall supports (calling subcontracts)
 *
 *  comments, suggestions and improvements are most welcome
 *
 *  npm dependencies:
 *      "acorn": "^5.1.1",
 *      "text-diff": "^1.0.1",
 */
(function (window) {
  "use strict";

  const acorn = require('acorn');
  const OpCodes = require(__dirname + "/libs/neo-vm/OpCode.js");
  const opCodes = OpCodes.codes;
  let ApplicationEngine = require(__dirname + "/libs/neo-vm/ApplicationEngine.js");
  // let neovm = require(__dirname + '/libs/neo-vm/neo-vm');
  let Diff = require('text-diff');

  if (typeof(neo) === 'undefined') {
    // neo.init();
    window.neo = neoInit();
  } else {
    console.error('unable to initialise neojs');
  }

  function neoInit() {
    return {
      OpCodes: OpCodes,
      methods: {},
      stack: {},
      sourceNodes: {},
      parser: neoParser(),
      byteCode: {},
      byteCodeScript: function () {
        return this.byteCode.join("").toLowerCase();
      }
    };
  }

  function neoParser() {
    return {
      parse: function (jsSource) {
        neo.methods = {};
        neo.stack = {};
        neo.activeRange = {};

        neo.sourceNodes = acorn.parse(jsSource, {
          sourceType: "module",
        });

        this.ProcessSourceBody();
        this.ProcessSourceToByteCode();

        this.TestApplicationEngine();
      },
      TestApplicationEngine: function () {
        /*
            if (tx == null) tx = new InvocationTransaction();
            tx.Version = 1;
            tx.Script = textBox6.Text.HexToBytes();
            if (tx.Attributes == null) tx.Attributes = new TransactionAttribute[0];
            if (tx.Inputs == null) tx.Inputs = new CoinReference[0];
            if (tx.Outputs == null) tx.Outputs = new TransactionOutput[0];
            if (tx.Scripts == null) tx.Scripts = new Witness[0];
            ApplicationEngine engine = ApplicationEngine.Run(tx.Script, tx);

         */
        console.log('---------------------------------------------------------------------------------');
        console.log(neo.byteCodeScript());
        let appEngine = new ApplicationEngine('trigger', 'container', 'table', 'service', 'gas', true);
        appEngine.CheckArraySize('asdf');
        let engine = appEngine.Run(neo.byteCodeScript(), null);
        console.log(appEngine);
        // appEngine.CheckArraySize();
        // appEngine.AddBreakPoint(15);
        console.log('---------------------------------------------------------------------------------');
      },
      ProcessSourceBody: function () {
        if (neo.sourceNodes.body.length <= 0) {
          console.log("ProcessSourceBody() no source nodes detected");
          return;
        }
        console.log("ProcessSourceBody() %d source nodes detected (range: %s)", neo.sourceNodes.body.length, JSON.stringify(this.NodeRange(neo.sourceNodes)));
        this.ProcessFunctionDeclarations(true);
        this.ProcessFunctionDeclarations(false);
      },
      ProcessFunctionDeclarations: function (justInitFunctionDeclarations) {
        for (let i in neo.sourceNodes.body) {
          let node = neo.sourceNodes.body[i];
          switch (node.type) {
            case "FunctionDeclaration":
              console.log("ProcessSourceBody() calling FunctionDeclaration");
              this.FunctionDeclaration(node, justInitFunctionDeclarations);
              break;
          }
        }
      },
      ProcessSourceToByteCode: function () {
        let byteCode = [];
        let currentAddress = 0;
        for (let i in neo.methods) {
          console.log('ProcessSourceToByteCode(): %s', neo.methods[i].methodName);
          let fnStack = neo.methods[i].stack;
          let fn = neo.methods[i];
          let cleanStack = {
            parent: fn,
            methodName: fn.methodName,
            sourceOperations: 0,
            address: 0,
            addressConvert: {},
            stack: [],
          };

          for (let n = 0; n < fnStack.length; n++) {
            cleanStack.stack.push(fnStack[n]);
            if (typeof(fnStack[n].bytes) !== 'undefined') {
              // add any additional bytes associated with this instruction
              for (let m = 0; m < fnStack[n].bytes.length; m++) {
                cleanStack.stack.push({code: fnStack[n].bytes[m], range: fnStack[n].range});
              }
            }
          }

          neo.methods[i].byteCodeAddress = currentAddress;
          currentAddress += cleanStack.stack.length;
          console.log('current: %d / method: %d', currentAddress, neo.methods[i].byteCodeAddress);

          byteCode = byteCode.concat(cleanStack.stack);
        }

        let byteCodeOutput = [];
        let byteCodeRanges = [];

        for (let n = 0; n < byteCode.length; n++) {
          if (byteCode[n].fixAddress === true) {
            // opCodes.CALL requires address rewrite after stack is determined
            let targetAddress = neo.methods[byteCode[n].targetAddress.methodName].byteCodeAddress;
            console.error('%s target address is %s / n is %d / %d (%s)', byteCode[n].targetAddress.methodName, targetAddress, n, targetAddress - n, this.IntToHex(targetAddress - n));
            let newAddress = this.HexByteArrayNumBits([this.IntToHex(targetAddress - n, false)], 2);
            byteCode[n + 1] = {code: newAddress[0], range: byteCode[n].range};
            byteCode[n + 2] = {code: newAddress[1], range: byteCode[n].range};
          }

          byteCodeOutput.push(byteCode[n].code.replace('0x', ''));
          // console.log(byteCode[n]);
          // if(typeof(byteCode[n].range) !== 'undefined') {
          byteCodeRanges.push('<span class="bc-data" data-start={0} data-end={1} title="{2}">{3}</span>'.format(
            byteCode[n].range.start,
            byteCode[n].range.end,
            (OpCodes.name(byteCode[n].code)).desc,
            byteCode[n].code
            )
          );
          // }
        }
        console.log('bytecode output is');
        console.log(byteCodeOutput);
        neo.byteCode = byteCodeOutput;

        let jsByteCode = byteCodeOutput.join(" ").toLowerCase();
        console.log('JS: %s', jsByteCode);
        let jsBC = $('#jsByteCode');
        let csBC = $('#csByteCode');
        let csByteCode = csBC.val().trim();
        console.log('CS: %s', csByteCode);
        jsBC.html(byteCodeRanges.join(" ").toLowerCase().replaceAll('0x', ''));
        jsBC.removeClass('is-danger');
        jsBC.removeClass('is-success');
        if (jsByteCode !== csByteCode) {
          jsBC.addClass('is-danger');
        } else {
          jsBC.addClass('is-success');
        }

        let diff = new Diff();
        let textDiff = diff.main(csByteCode, jsByteCode);
        $('#byteCodeDiff').html(diff.prettyHtml(textDiff));
      },

      FunctionDeclaration: function (node, justInitFunctionDeclarations) {
        console.log('FunctionDeclaration(%s) called: %s (range: %s)', justInitFunctionDeclarations, node.id.name, JSON.stringify(this.NodeRange(node)));
        this.SetActiveRange(node);
        let totalVarCount = 0;
        if (justInitFunctionDeclarations) {
          // only initialise the function list, this happens so that we can determine
          // defined functions in main body before processing and to also determine return type (if any)
          neo.methods[node.id.name] = {
            functionArguments: [],
            functionVariables: {},
            sourceOperations: 0,
            address: 0,
            addressConvert: {},
            methodName: node.id.name,
            totalVars: 0,
            varCount: 0,
            totalFunctionArgs: node.params.length,
            byteCodeAddress: 0,
            hasReturnStatement: false,
            firstRun: true,
            stack: [],
          };

          for (let n = 0; n < node.params.length; n++) {
            let functionParamObject = {
              name: node.params[n].name,
              pos: n,
              isFunctionArgument: true,
              wasUsed: false, // todo: wasUsed may be deprecated
            };
            neo.methods[node.id.name].functionArguments.push(functionParamObject);
            neo.methods[node.id.name].functionVariables[node.params[n].name] = functionParamObject;
          }
        } else {
          totalVarCount = neo.methods[node.id.name].varCount + neo.methods[node.id.name].totalFunctionArgs;
          console.log(neo.methods[node.id.name]);
          neo.methods[node.id.name].sourceOperations = 0;
          neo.methods[node.id.name].address = 0;
          neo.methods[node.id.name].addressConvert = {};
          neo.methods[node.id.name].varCount = 0;
          neo.methods[node.id.name].totalFunctionArgs = node.params.length;
          neo.methods[node.id.name].byteCodeAddress = 0;
          neo.methods[node.id.name].stack = [];
          neo.methods[node.id.name].firstRun = false;
        }

        let functionStack = neo.methods[node.id.name];
        //_insertBeginCode
        console.error('%s has %d vars', functionStack.methodName, functionStack.totalVars);
        console.error('%d vars', totalVarCount);
        console.log(functionStack);
        this.InsertPushNumber(functionStack, (totalVarCount));
        this.InsertPushOne(functionStack, opCodes.NEWARRAY);
        this.InsertPushOne(functionStack, opCodes.TOALTSTACK);

        for (let n = 0; n < functionStack.totalFunctionArgs; n++) {
          this.ConvertStLoc(functionStack, n);
        }
        //_insertBeginCode end

        this.BlockStatement(functionStack, node.body);

        //_insertEndCode
        this.ConvertPushOne(functionStack, opCodes.NOP, functionStack.sourceOperations++);
        this.InsertPushOne(functionStack, opCodes.FROMALTSTACK);
        this.InsertPushOne(functionStack, opCodes.DROP);
        this.ConvertPushOne(functionStack, opCodes.RET, functionStack.sourceOperations++);
        //_insertEndCode end

        //ConvertAddrInMethod
        console.log(functionStack.addressConvert);
        for (let n = 0; n < functionStack.stack.length; n++) {
          let stackItem = functionStack.stack[n];
          if (stackItem.fixAddress && stackItem.code !== opCodes.CALL) {
            let sourceAddress = stackItem.sourceAddress;// + 2;
            // let addressOffset = functionStack.addressConvert[sourceAddress] - stackItem.address;
            let addressOffset = functionStack.address - stackItem.address;
            stackItem.bytes = this.HexByteArrayNumBits([this.IntToHex(addressOffset, false)], 2);
            stackItem.fixAddress = false;
            console.log(functionStack);
            console.log(stackItem);
            console.log('ConvertAddrInMethod method.address=%s', functionStack.address);
            console.log('ConvertAddrInMethod stackItem.sourceAddress=%s', stackItem.sourceAddress);
            console.log('ConvertAddrInMethod stackItem.address=%s', stackItem.address);
            console.log('ConvertAddrInMethod functionStack.addressConvert[sourceAddress]=%s', functionStack.addressConvert[sourceAddress]);
            console.log('ConvertAddrInMethod addressOffset=%s', addressOffset);
            console.log('ConvertAddrInMethod src=%d, addr=%d, offset=%d', sourceAddress, functionStack.addressConvert[sourceAddress], addressOffset);
          }
        }
        //ConvertAddrInMethod end
      },
      SetActiveRange: function (node) {
        this.activeRange = this.NodeRange(node);
        console.log("active range set to %o", this.activeRange);
      },
      BlockStatement: function (parentMethod, node) {
        this.SetActiveRange(node);
        console.log('BlockStatement() called (range: %s)', JSON.stringify(this.NodeRange(node)));
        console.log(node);
        this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++);

        for (let i = 0; i < node.body.length; i++) {
          let childNode = node.body[i];
          this.SetActiveRange(childNode);
          switch (childNode.type) {
            case "VariableDeclaration":
              this.VariableDeclaration(parentMethod, childNode.declarations);
              break;
            case "ExpressionStatement":
              this.ExpressionStatement(parentMethod, childNode.expression);
              break;
            case "ReturnStatement":
              this.ReturnStatement(parentMethod, childNode.argument);
              break;
            case "IfStatement":
              console.error('BlockStatement() IfStatement');
              this.IfStatement(parentMethod, childNode);
              break;
            default:
              console.error('BlockStatement() unhandled: %s', childNode.type);
              console.log(childNode);
          }
        }
      },
      ParseExpression: function (parentMethod, expression, expressionType = false, nestedCall = 0, operatorType = false) {
        if (nestedCall <= 0) {
          this.IncrementMethodVarCount(parentMethod);
        }
        console.log('expression %o', expression);
        switch (expression.type) {
          case "LogicalExpression":
            console.log('ParseExpression.LogicalExpression: nestedCall: %d', nestedCall);
            this.SetActiveRange(expression);

            let operatorInt = 0;
            switch (expression.operator) {
              case "&&":
                break;
              case "||":
                operatorInt = 1;
                break;
            }
            let nestedCallIncrement = nestedCall + 1;
            // Blt
            // Bgt
            this.ParseExpression(parentMethod, expression.left, expression.type, nestedCallIncrement, expression.operator);
            let code = this.ConvertPushOne(parentMethod, opCodes.JMPIF, parentMethod.sourceOperations, [this.IntToHex(0), this.IntToHex(0)]);
            console.log('JMP target is: %s', parentMethod.sourceOperations);

            this.ParseExpression(parentMethod, expression.right, expression.type, nestedCallIncrement);

            code.fixAddress = true;
            console.log(parentMethod);
            let multipleConditionalOffset = nestedCall === 1 ? 6 : 0;
            console.log('multipleConditionalOffset: offset: %d / %s', nestedCallIncrement, parentMethod.totalVars);
            code.sourceAddress = parentMethod.sourceOperations + 2 + multipleConditionalOffset;

            if (nestedCallIncrement <= 1) {
              code = this.ConvertPushOne(parentMethod, opCodes.JMP, parentMethod.sourceOperations++, [this.IntToHex(0), this.IntToHex(0)]);
              console.log('JMP target is: %s', parentMethod.sourceOperations);
              code.fixAddress = true;
              code.sourceAddress = parentMethod.sourceOperations + 1;
              this.ConvertPushNumber(parentMethod, operatorInt, parentMethod.sourceOperations++);
            }
            break;
          case "Literal":
            this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++);
            this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++);
            break;
          case "BinaryExpression":
            this.SetActiveRange(expression);
            console.log('BinaryExpression() nestedCall: %s', nestedCall);
            console.log('BinaryExpression() expressionType: %s', expressionType);
            console.log('BinaryExpression() expressionType: %o', expression);
            this.ConvertLdLoc(parentMethod, parentMethod.functionVariables[expression.left.name].pos);
            this.ConvertLdLoc(parentMethod, parentMethod.functionVariables[expression.right.name].pos);
            let operatorOpCode = expression.operator === '>' ? opCodes.GT : opCodes.LT;
            switch (expression.operator) {
              case ">":
                operatorOpCode = opCodes.GT;
                if (operatorType === '&&') {
                  operatorOpCode = opCodes.LTE;
                }
                this.ConvertPushOne(parentMethod, operatorOpCode, parentMethod.sourceOperations++);
                break;
              case ">=":
                operatorOpCode = opCodes.LT;

                if (operatorType === '||') {
                  operatorOpCode = opCodes.GTE;
                }
                console.log('operatorOpCode: %s', operatorOpCode);
                console.log('operatorType: %s', operatorType);
                this.ConvertPushOne(parentMethod, operatorOpCode, parentMethod.sourceOperations++);
                if (operatorType !== '||' && operatorType !== '&&' && nestedCall <= 1) {
                  this.ConvertPushNumber(parentMethod, 0, parentMethod.sourceOperations++);
                  this.ConvertPushOne(parentMethod, opCodes.NUMEQUAL, parentMethod.sourceOperations++);
                }
                break;
              case "<":
                console.log('operatorOpCode: %s', operatorOpCode);
                console.log('operatorType: %s', operatorType);
                operatorOpCode = opCodes.LT;
                if (operatorType === '&&') {
                  operatorOpCode = opCodes.GTE;
                }
                this.ConvertPushOne(parentMethod, operatorOpCode, parentMethod.sourceOperations++);
                break;
              case "<=":
                operatorOpCode = opCodes.GT;

                if (operatorType === '||') {
                  operatorOpCode = opCodes.LTE;
                }
                console.log('operatorOpCode: %s', operatorOpCode);
                console.log('operatorType: %s', operatorType);
                this.ConvertPushOne(parentMethod, operatorOpCode, parentMethod.sourceOperations++);
                if (operatorType !== '||' && operatorType !== '&&' && nestedCall <= 1) {
                  this.ConvertPushNumber(parentMethod, 0, parentMethod.sourceOperations++);
                  this.ConvertPushOne(parentMethod, opCodes.NUMEQUAL, parentMethod.sourceOperations++);
                }
                break;
            }
            break;
        }
      },

      IfStatement: function (parentMethod, expression) {
        console.error("IfStatement()");
        console.log(expression);

        let testResult = this.TestConditionalStatement(parentMethod, expression.test);
        this.ParseExpression(parentMethod, expression.test);
        console.log('test result was %s', testResult);
        if (expression.consequent !== null) {
          console.error('IfStatement(): %s expression.consequent !== null', expression.test.type);
          let conditionalLocation = (parentMethod.varCount + parentMethod.totalFunctionArgs) - 1;
          console.log('conditionalLocation parentMethod.varCount %s', parentMethod.varCount);
          console.log('conditionalLocation parentMethod.totalVars %s', parentMethod.totalVars);
          console.log('conditionalLocation parentMethod.totalFunctionArgs %s', parentMethod.totalFunctionArgs);
          console.error('pushing %s', conditionalLocation);
          this.ConvertStLoc(parentMethod, conditionalLocation);
          this.ConvertLdLoc(parentMethod, conditionalLocation);

          // brfalse - JMP to this address on false (else)
          let code = this.ConvertPushOne(parentMethod, opCodes.JMPIFNOT, parentMethod.sourceOperations++, [this.IntToHex(0), this.IntToHex(0)]);
          console.log('JMP: sourceOperations is %s', parentMethod.sourceOperations);

          this.BlockStatement(parentMethod, expression.consequent);
          this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++);

          console.log('JMP target is: %s', parentMethod.sourceOperations);
          code.fixAddress = true;
          let addressIncrement = expression.alternate !== null ? 2 : 0;
          code.sourceAddress = parentMethod.sourceOperations + addressIncrement;

        }

        if (expression.alternate !== null) {
          let code = this.ConvertPushOne(parentMethod, opCodes.JMP, parentMethod.sourceOperations++, [this.IntToHex(0), this.IntToHex(0)]);
          console.log('JMP: sourceOperations is %s', parentMethod.sourceOperations);

          this.BlockStatement(parentMethod, expression.alternate);
          this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++);

          console.log('JMP target is: %s', parentMethod.sourceOperations);
          code.fixAddress = true;
          code.sourceAddress = parentMethod.sourceOperations;

        }
        console.error('leaving IfStatement');
      },

      TestConditionalStatement: function (parentMethod, conditional) {
        console.error("TestConditionalStatement()");
        console.log(conditional);
        let leftTest, rightTest;
        // testHasLeft = typeof(conditional.left) !== 'undefined';
        // testHasRight = typeof(conditional.right) !== 'undefined';
        let testCondition = false;

        if (typeof(conditional.type) !== 'undefined') {
          switch (conditional.type) {
            case "LogicalExpression":
              leftTest = this.TestConditionalStatement(parentMethod, conditional.left);
              rightTest = this.TestConditionalStatement(parentMethod, conditional.right);
              switch (conditional.operator) {
                case "&&":
                  console.log('TestConditionalStatement() leftTest: %s, rightTest: %s', leftTest, rightTest);
                  testCondition = leftTest && rightTest;
                  break;
                case "||":
                  testCondition = leftTest || rightTest;
                  break;
                default:
                  alert('unhandled logical expression operator: ' + conditional.operator);
              }
              console.error("LogicalExpression()");
              console.log(conditional);
              break;
            case "BinaryExpression":
              let left = parentMethod.functionVariables[conditional.left.name];
              let right = parentMethod.functionVariables[conditional.right.name];
              switch (conditional.operator) {
                case ">":
                  testCondition = left.value > right.value;
                  break;
                case "<":
                  testCondition = left.value < right.value;
                  break;
                case ">=":
                  testCondition = left.value >= right.value;
                  break;
                case "<=":
                  testCondition = left.value <= right.value;
                  break;
              }
              console.log('left: %o', left);
              console.log('right: %o', right);
              console.log('comparison: %s %s %s = %s', left.value, conditional.operator, right.value, testCondition);
              break;
            case "UnaryExpression":
              console.error("UnaryExpression()");
              console.log(conditional);
              break;
            case "Identifier":
              let conditionVar = parentMethod.functionVariables[conditional.name];
              testCondition = conditionVar.value;
              break;
            case "Literal":
              console.log("Literal - adding var count");
              testCondition = conditional.value;
              this.ConvertPushOne(parentMethod, conditional.value ? opCodes.PUSH1 : opCodes.PUSH0, parentMethod.sourceOperations++);
              console.log('var count is %d', parentMethod.varCount);// parentMethod.varCount++;
              this.ConvertStLoc(parentMethod, parentMethod.varCount++ + parentMethod.totalFunctionArgs);
              break;
            default:
              console.error('TestConditionalStatement() unhandled conditional.type: %s', conditional.type);
          }
        } else {
          // not a condition with a type, must be literal
          console.error('unhandled conditional type: %s', conditional.type);
          console.log(conditional);
        }
        console.log('test condition was: %s', testCondition);
        return testCondition;
      },

      ReturnStatement: function (parentMethod, expression) {
        console.error('ReturnStatement()');
        parentMethod.hasReturnStatement = true;

        if (expression !== null) {
          this.VariableAssignment(parentMethod, expression);
        }

        let code = this.ConvertPushOne(parentMethod, opCodes.JMP, parentMethod.sourceOperations++, [this.IntToHex(0), this.IntToHex(0)]);
        code.fixAddress = true;
        code.sourceAddress = parentMethod.sourceOperations;

        this.ConvertLdLoc(parentMethod, (parentMethod.totalFunctionArgs + parentMethod.totalVars) - 1);
      },

      IncrementMethodTotalVars: function (parentMethod) {
        if (parentMethod.firstRun) {
          console.log('IncrementMethodTotalVars: %s / %d', parentMethod.methodName, parentMethod.totalVars);
          parentMethod.totalVars++;
        }
      },
      IncrementMethodVarCount: function (parentMethod) {
        console.log('IncrementMethodVarCount: %s / %d', parentMethod.methodName, parentMethod.varCount);
        parentMethod.varCount++;
      },

      ExpressionStatement: function (parentMethod, expression) {
        console.info('ExpressionStatement() called with expression: %s', expression.type);
        switch (expression.type) {
          case "CallExpression":
            this.CallExpression(parentMethod, expression);
            break;
          case "AssignmentExpression":
            this.AssignmentExpression(parentMethod, expression);
            break;
          default:
            console.error('ExpressionStatement() unhandled: %s', expression.type);
        }
      },

      AssignmentExpression: function (parentMethod, expression) {
        console.log(expression);
        console.log(parentMethod.functionVariables);
        switch (expression.operator) {
          case "=":
            if (expression.left.type === "MemberExpression") {
              // an array or object
              let assignmentVarName = expression.left.object.name;
              parentMethod.functionVariables[assignmentVarName].value[expression.left.property.raw] = expression.right.value;
              this.ConvertLdLoc(parentMethod, parentMethod.functionVariables[assignmentVarName].pos + parentMethod.totalFunctionArgs);
              this.ConvertPushNumber(parentMethod, parseInt(expression.left.property.raw));
            }

            switch (typeof(expression.right.value)) {
              case "string":
                this.ConvertPushArray(parentMethod, this.StringToByteArray(expression.right.value));
                break;
              case "number":
                console.log("AssignmentExpression() logging number: %s", expression.right.value);
                this.ConvertPushNumber(parentMethod, expression.right.value, parentMethod.sourceOperations++);
                break;
              case "boolean":
                console.log("AssignmentExpression() logging boolean: %s", expression.right.value);
                this.ConvertPushNumber(parentMethod, expression.right.value ? 1 : 0, parentMethod.sourceOperations++);
                break;
            }
            if (expression.left.type === "Identifier") {
              parentMethod.functionVariables[expression.left.name].value = expression.right.value;
              this.ConvertPushOne(parentMethod, opCodes.FROMALTSTACK, parentMethod.sourceOperations++);
              this.ConvertPushOne(parentMethod, opCodes.DUP);
              this.ConvertPushOne(parentMethod, opCodes.TOALTSTACK);
              this.ConvertPushNumber(parentMethod, parentMethod.functionVariables[expression.left.name].pos + parentMethod.totalFunctionArgs);
              this.ConvertPushNumber(parentMethod, 2);
              this.ConvertPushOne(parentMethod, opCodes.ROLL);
            }

            this.ConvertPushOne(parentMethod, opCodes.SETITEM, parentMethod.sourceOperations++);
            break;
          default:
            console.error('ExpressionStatement() AssignmentExpression unhandled operator: %s', expression.operator);
        }

      },

      CallExpression: function (parentMethod, callExpression, assignReturnValue = false) {
        let callType = 0;
        if (typeof(neo.methods[callExpression.callee.name]) !== 'undefined') {
          // found a call to a method declared in this contract
          callType = 1;
          console.log('CallExpression(): %s', callExpression.callee.name);
          let numArgs = callExpression.arguments.length;
          if (numArgs > 0) {
            // let identifiersAdded = 0;
            for (let i = 0; i < numArgs; i++) {
              let expr = callExpression.arguments[i];
              console.error('expression args with type: %s', expr.type);
              switch (expr.type) {
                case "Identifier":
                  neo.methods[callExpression.callee.name].functionArguments[i].value = parentMethod.functionVariables[expr.name].value;
                  this.ConvertLdLoc(parentMethod, parentMethod.functionVariables[expr.name].pos + parentMethod.totalFunctionArgs);
                  break;
                case "Literal":
                  neo.methods[callExpression.callee.name].functionArguments[i].value = expr.value;
                  // neo.methods[callExpression.callee.name].functionArguments.push({value: expr.value});
                  switch (typeof(expr.value)) {
                    case "number":
                      this.ConvertPushNumber(parentMethod, expr.value);
                      break;
                    case "string":
                      this.ConvertPushArray(parentMethod, this.StringToByteArray(expr.value));
                      break;
                    case "boolean":
                      console.log("CallExpression() logging boolean: %s", expr.value);
                      this.ConvertPushNumber(parentMethod, expr.value ? 1 : 0, parentMethod.sourceOperations++);
                      break;
                    default:
                      console.error('CallExpression() unhandled expression value: %s', typeof(expr.value));
                  }
                  break;
                default:
                  console.error('CallExpression() unhandled expression type: %s', typeof(expr.type));
                  break;
              }
            }
          }

          // this.StackPushCode(parentMethod, opCodes.NOP, true);
          this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++);

          if (numArgs === 2) {
            this.ConvertPushOne(parentMethod, opCodes.SWAP);
          } else if (numArgs === 3) {
            this.ConvertPushNumber(parentMethod, 2);
            this.ConvertPushOne(parentMethod, opCodes.XSWAP);
          } else if (numArgs > 1) {
            for (let i = 0; i < numArgs / 2; i++) {
              let saveTo = numArgs - 1 - i;
              this.ConvertPushNumber(parentMethod, saveTo);
              this.ConvertPushOne(parentMethod, opCodes.PICK);

              this.ConvertPushNumber(parentMethod, i + 1);
              this.ConvertPushOne(parentMethod, opCodes.PICK);

              this.ConvertPushNumber(parentMethod, saveTo + 2);
              this.ConvertPushOne(parentMethod, opCodes.XSWAP);
              this.ConvertPushOne(parentMethod, opCodes.DROP);

              this.ConvertPushNumber(parentMethod, i + 1);
              this.ConvertPushOne(parentMethod, opCodes.XSWAP);
              this.ConvertPushOne(parentMethod, opCodes.DROP);

            }
          }

          let targetAddress = [this.IntToHex(5), this.IntToHex(0)];
          let code = this.ConvertPushOne(parentMethod, opCodes.CALL, parentMethod.sourceOperations++, targetAddress);
          code.fixAddress = true;
          code.targetAddress = neo.methods[callExpression.callee.name];


          if (neo.methods[callExpression.callee.name].hasReturnStatement) {
            // this method has a return statement
            if (!assignReturnValue) {
              // return value (if any) is not assigned, drop
              this.ConvertPushOne(parentMethod, opCodes.DROP, parentMethod.sourceOperations++);
            }
          } else {
            this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++)
          }
        }
      },

      VariableDeclaration: function (parentMethod, declarations) {
        console.error('VariableDeclaration() called with %d declarations', declarations.length);
        console.log(declarations);
        for (let i = 0; i < declarations.length; i++) {
          this.SetActiveRange(declarations[i]);
          let varPosition = parentMethod.varCount;
          let returnValue = this.VariableAssignment(parentMethod, declarations[i].init, declarations[i].id.name);
          parentMethod.functionVariables[declarations[i].id.name] = {
            pos: varPosition,
            value: returnValue,
            isFunctionArgument: false,
            wasUsed: false,
          };
        }
      },

      VariableAssignment: function (parentMethod, variable, variableName = null) {
        console.error('VariableAssignment()');
        let returnValue = "";
        this.IncrementMethodTotalVars(parentMethod);

        if (variable === null) {
          this.IncrementMethodVarCount(parentMethod);
          return;
        }
        switch (variable.type) {
          case "Literal":
            console.log("VariableAssignment(): %s", typeof(variable.value));
            switch (typeof(variable.value)) {
              case "string":
                this.ConvertPushArray(parentMethod, this.StringToByteArray(variable.value), parentMethod.sourceOperations++);
                break;
              case "number":
                console.log("VariableAssignment() logging number: %d", variable.value);
                this.ConvertPushNumber(parentMethod, variable.value, parentMethod.sourceOperations++);
                break;
              case "boolean":
                console.log("VariableAssignment() logging boolean: %s", variable.value);
                this.ConvertPushNumber(parentMethod, variable.value ? 1 : 0, parentMethod.sourceOperations++);
                break;
              default:
                console.error('VariableAssignment() unhandled expression type: %s', typeof(variable.value));
                console.log(variable);
            }
            returnValue = variable.value;
            break;
          case "ArrayExpression":
            console.error('VariableAssignment() ArrayExpression');
            console.log(variable);
            //_ConvertNewArr
            let arrayLength = variable.elements.length;
            if (!parentMethod.firstRun) {
              arrayLength = parentMethod.functionVariables[variableName].value.length;
            }
            console.log('array length is: %d', arrayLength);
            this.ConvertPushNumber(parentMethod, variable.elements.length);
            this.ConvertPushOne(parentMethod, opCodes.NEWARRAY, parentMethod.sourceOperations++);
            console.log(variable.elements);
            returnValue = [];
            for (let n = 0; n < variable.elements.length; n++) {
              this.ConvertPushOne(parentMethod, opCodes.DUP, parentMethod.sourceOperations++);
              this.ConvertPushNumber(parentMethod, n);
              returnValue.push(variable.elements[n].value);
              console.log(parentMethod);
              console.log(variable.elements[n]);
              switch (typeof(variable.elements[n].value)) {
                case "string":
                  this.ConvertPushArray(parentMethod, this.StringToByteArray(variable.elements[n].value), parentMethod.sourceOperations++);
                  break;
                case "number":
                  console.log("ArrayExpression() logging number: %d", variable.elements[n].value);
                  this.ConvertPushNumber(parentMethod, variable.elements[n].value, parentMethod.sourceOperations++);
                  break;
                case "boolean":
                  console.log("ArrayExpression() logging boolean: %s", variable.elements[n].value);
                  this.ConvertPushNumber(parentMethod, variable.elements[n].value ? 1 : 0, parentMethod.sourceOperations++);
                  break;
                default:
                  console.error('ArrayExpression() unhandled expression type: %s', typeof(variable.elements[n].value));
                  console.log(variable);
              }
              this.ConvertPushOne(parentMethod, opCodes.SETITEM, parentMethod.sourceOperations++);
              // parentMethod.varCount--;
            }
            break;
          case "CallExpression":
            this.CallExpression(parentMethod, variable, true);
            break;
          case "Identifier":
            console.error("VariableAssignment().Identifier");
            let sourceVariable = parentMethod.functionVariables[variable.name];
            sourceVariable.wasUsed = true;
            returnValue = sourceVariable.value;
            if (sourceVariable.isFunctionArgument) {
              // opcodes.ldArg
              this.ConvertLdLoc(parentMethod, sourceVariable.pos);
            } else {
              // opcodes.ldloc
              this.ConvertLdLoc(parentMethod, sourceVariable.pos + parentMethod.totalFunctionArgs);
            }
            break;
          case "BinaryExpression":
            console.log(variable);
            this.BinaryExpression(parentMethod, variable);
            break;
          default:
            console.error('VariableAssignment() unhandled: %s', variable.type);
            console.log(variable);
            return;
        }

        console.log('VariableAssignment() VariableDeclarator');
        this.ConvertStLoc(parentMethod, parentMethod.varCount + parentMethod.totalFunctionArgs);
        this.IncrementMethodVarCount(parentMethod);

        return returnValue;
      },

      BinaryExpression: function (parentMethod, variable) {
        console.error(variable);
      },

      ConvertStLoc: function (parentMethod, pos) {
        this.ConvertPushOne(parentMethod, opCodes.FROMALTSTACK, parentMethod.sourceOperations++);
        this.ConvertPushOne(parentMethod, opCodes.DUP);
        this.ConvertPushOne(parentMethod, opCodes.TOALTSTACK);
        this.ConvertPushNumber(parentMethod, pos);
        this.ConvertPushNumber(parentMethod, 2);
        this.ConvertPushOne(parentMethod, opCodes.ROLL);
        this.ConvertPushOne(parentMethod, opCodes.SETITEM);
      },
      ConvertLdLoc: function (parentMethod, pos) {
        this.ConvertPushOne(parentMethod, opCodes.FROMALTSTACK, parentMethod.sourceOperations++);
        this.ConvertPushOne(parentMethod, opCodes.DUP);
        this.ConvertPushOne(parentMethod, opCodes.TOALTSTACK);
        this.ConvertPushNumber(parentMethod, pos);
        this.ConvertPushOne(parentMethod, opCodes.PICKITEM);
      },
      ConvertPushOne: function (parentMethod, mCode, mSourceOperations = null, mExtraData = null) {
        // let opCodeData = OpCodes.name(mCode);
        // console.error('ConvertPushOne() %s=%s: addr=%s', opCodeData.code, opCodeData.desc, mSourceOperations);
        // console.error('active range: %o', this.activeRange);
        let startAddress = parentMethod.address;

        let code = {
          address: parentMethod.address,
          code: mCode,
          debugCode: null,
          fixAddress: false,
          sourceAddress: 0,
          targetAddress: null,
          range: this.activeRange,
        };

        if (mSourceOperations !== null) {
          if (mCode === opCodes.JMP || mCode === opCodes.JMPIFNOT || mCode === opCodes.JMPIF) {
            console.log('ConvertPushOne() JMP/JMPIFNOT/JMPIF - sourceoperations++');
            parentMethod.sourceOperations++;
          }
          parentMethod.addressConvert[mSourceOperations] = startAddress;
          console.log('ConvertPushOne() %s %s / addressConvert: %s = %s', parentMethod.methodName, mCode, mSourceOperations, startAddress);
        }

        parentMethod.address++;

        if (mExtraData !== null) {
          console.log('ConvertPushOne() adding extraData: ' + mExtraData.join("") + " len: " + mExtraData.length);
          code.bytes = mExtraData;
          parentMethod.address += mExtraData.length;
        }
        parentMethod.stack.push(code);
        return code;
      },
      ConvertPushNumber: function (parentMethod, mValue, mSourceOperations) {
        // console.error('ConvertPushNumber() ' + mValue);
        if (mValue === 0) {
          return this.ConvertPushOne(parentMethod, opCodes.PUSH0, mSourceOperations);
        } else if (mValue === -1) {
          return this.ConvertPushOne(parentMethod, opCodes.PUSHM1, mSourceOperations);
        } else if (mValue > 0 && mValue <= 16) {
          return this.ConvertPushOne(parentMethod, this.IntToHex((0x50 + mValue)), mSourceOperations);
        } else {
          return this.ConvertPushArray(parentMethod, this.HexToByteArray(this.IntToHex(mValue)).reverse(), mSourceOperations);
        }
      },
      ConvertPushArray: function (parentMethod, mArray, mSourceOperations) {
        let prefixLen, code;

        if (mArray.length === 0) {
          return this.ConvertPushOne(parentMethod, opCodes.PUSH0, mSourceOperations);
        } else if (mArray.length <= 75) {
          return this.ConvertPushOne(parentMethod, this.IntToHex(mArray.length), mSourceOperations, mArray);
        } else if (mArray.length <= 255) {
          prefixLen = 1;
          code = opCodes.PUSHDATA1;
        } else if (mArray.length <= 65535) {
          prefixLen = 2;
          code = opCodes.PUSHDATA2;
        } else {
          prefixLen = 4;
          code = opCodes.PUSHDATA4;
        }

        let signedLength = this.HexByteArrayNumBits(this.HexToByteArray(this.IntToHex(mArray.length)).reverse(), prefixLen);
        return this.ConvertPushOne(parentMethod, code, mSourceOperations, signedLength.concat(mArray));
      },

      InsertPushOne: function (parentMethod, mCode, mComment = null, mExtraData = null) {
        let code = {
          address: parentMethod.address,
          code: mCode,
          debugCode: mComment,
          fixAddress: false,
          sourceAddress: 0,
          targetAddress: null,
          range: this.activeRange,
        };

        if (mComment !== null) {
        }

        parentMethod.address++;

        if (mExtraData !== null) {
          console.log('InsertPushOne() adding extraData: ');
          console.log(mExtraData);
          code.bytes = mExtraData;
          parentMethod.address += mExtraData.length;
        }
        parentMethod.stack.push(code);
        return code;
      },
      InsertPushNumber: function (parentMethod, mValue, mComment = null) {
        // console.log('InsertPushNumber() ' + mValue);
        if (mValue === 0) {
          return this.InsertPushOne(parentMethod, opCodes.PUSH0, mComment);
        } else if (mValue === -1) {
          return this.InsertPushOne(parentMethod, opCodes.PUSHM1, mComment);
        } else if (mValue > 0 && mValue <= 16) {
          return this.InsertPushOne(parentMethod, this.IntToHex((0x50 + mValue)), mComment);
        } else {
          return this.InsertPushArray(parentMethod, this.HexToByteArray(this.IntToHex(mValue)).reverse(), mComment);
        }
      },
      InsertPushArray: function (parentMethod, mArray, mComment = null) {
        let prefixLen, code;
        // console.log('InsertPushArray(): Length: ' + mArray.length);

        if (mArray.length === 0) {
          return this.InsertPushOne(parentMethod, opCodes.PUSH0, mComment);
        } else if (mArray.length <= 75) {
          return this.InsertPushOne(parentMethod, mArray.length, mComment, mArray);
        } else if (mArray.length <= 255) {
          prefixLen = 1;
          code = opCodes.PUSHDATA1;
        } else if (mArray.length <= 65535) {
          prefixLen = 2;
          code = opCodes.PUSHDATA2;
        } else {
          prefixLen = 4;
          code = opCodes.PUSHDATA4;
        }

        let signedLength = this.HexByteArrayNumBits(this.HexToByteArray(this.IntToHex(mArray.length)).reverse(), prefixLen);
        return this.InsertPushOne(parentMethod, code, mComment, signedLength.concat(mArray));
      },

      /**
       * helper method to determine how long a method is
       * @param node
       * @returns {{start, end, range: number}}
       * @constructor
       */
      NodeRange: function (node) {
        return {
          start: node.start,
          end: node.end,
          range: node.end - node.start
        }
      },
      ArrayToByteArray: function (mArray) {
        return mArray.map(function (c) {
          return c.charCodeAt(0).toString(16);
        });
      },

      StringToByteArray: function (mValue) {
        return this.ArrayToByteArray(mValue.split(''));
      },

      HexToByteArray: function (mString) {
        let ret = [];
        for (let i = 0; i < mString.length; i += 2) {
          ret.push(mString[i] + "" + mString[i + 1]);
        }
        return ret;
      },

      HexByteArrayNumBits: function (mArray, bits = 0) {
        if (typeof(mArray[0]) === 'object') {
          mArray = mArray[0];
        }

        for (let i = 0; i < mArray.length; i++) {
          if (mArray[i].length > 2) {
            mArray[i + 1] = mArray[i].substr(0, 2);
            mArray[i] = mArray[i].substr(2, 4);
          }
        }

        for (let i = mArray.length; i < bits; i++) {
          mArray.push("00");
        }
        return mArray;
      },

      /**
       * @return {string}
       */
      IntToHex: function (mNumber, useMSB = true) {
        // worst way to do twos complement D:

        if (mNumber < 0) {
          return this.HexToByteArray((65535 + mNumber + 1).toString(16)).reverse();
        }

        let h = mNumber.toString(16);
        let val = h.length % 2 ? '0' + h : h;
        let msb = {8: 1, 9: 1, a: 1, b: 1, c: 1, d: 1, e: 1, f: 1};
        if (useMSB && mNumber > 127 && typeof(msb[val.substr(0, 1)]) !== 'undefined') {
          val = '00' + val;
        }
        return val;
      },
    }
  }
})(window);