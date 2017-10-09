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

  let opCodes = opCodesList();
  let acorn = require('acorn');
  let neo = neoInit();
  let Diff = require('text-diff');

  if (typeof(neoJSEngine) === 'undefined') {
    // neo.init();
    window.neoJSEngine = neo;
  } else {
    console.error('unable to initialise neojs');
  }

  function neoInit() {
    return {
      methods: {},
      stack: {},
      sourceNodes: {},
      parser: neoParser(),
      opCodeDescs: null,
    };
  }

  function neoParser() {
    return {
      parse: function (jsSource) {
        console.log(this);
        neo.methods = {};
        neo.stack = {};
        neo.activeRange = {};

        neo.sourceNodes = acorn.parse(jsSource, {
          sourceType: "module",
        });

        this.ProcessSourceBody();
        this.ProcessSourceToByteCode();
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
            byteCode[n + 1] = {code: '0x' + newAddress[0], range: byteCode[n].range};
            byteCode[n + 2] = {code: '0x' + newAddress[1], range: byteCode[n].range};
          }
          byteCodeOutput.push(byteCode[n].code);
          console.log(byteCode[n]);
          // if(typeof(byteCode[n].range) !== 'undefined') {
            byteCodeRanges.push('<span class="bc-data" data-start={0} data-end={1} title="{2}">{3}</span>'.format(
              byteCode[n].range.start,
              byteCode[n].range.end,
              (this.opCodeDesc(byteCode[n].code)).desc,
              byteCode[n].code
              )
            );
          // }
        }
        console.log(byteCodeOutput);

        let jsByteCode = byteCodeOutput.join(" ").toLowerCase().replaceAll('0x', '');
        let jsBC = $('#jsByteCode');
        let csBC = $('#csByteCode');
        let csByteCode = csBC.val().trim();
        console.log(csByteCode);
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
        let opCodeData = this.opCodeDesc(mCode);
        console.error('ConvertPushOne() %s=%s: addr=%s', opCodeData.code, opCodeData.desc, mSourceOperations);
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
        console.error('ConvertPushNumber() ' + mValue);
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
        console.log('InsertPushNumber() ' + mValue);
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
        console.log('InsertPushArray(): Length: ' + mArray.length);

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

        for(let i = 0; i < mArray.length; i++) {
          if(mArray[i].length > 2) {
            mArray[i+1] = mArray[i].substr(0, 2);
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

      opCodeDesc: function (opcode) {
        if (typeof(this.opCodeDescs) === 'undefined') {
          this.opCodeDescs = {};
          for (let n in opCodes) {
            this.opCodeDescs[opCodes[n]] = n;
          }
        }
        if (opcode.indexOf('0x') === -1) {
          opcode = '0x' + opcode;
        }
        return {code: opcode, desc: this.opCodeDescs[opcode]};
      }

    }
  }

  function opCodesList() {
    return {
      PUSH0: "0x00", // An empty array of bytes is pushed onto the stack.
      PUSHF: "PUSH0",
      PUSHBYTES1: "0x01", // 0x01-0x4B The next opcode bytes is data to be pushed onto the stack
      PUSHBYTES75: "0x4B",
      PUSHDATA1: "0x4C", // The next byte contains the number of bytes to be pushed onto the stack.
      PUSHDATA2: "0x4D", // The next two bytes contain the number of bytes to be pushed onto the stack.
      PUSHDATA4: "0x4E", // The next four bytes contain the number of bytes to be pushed onto the stack.
      PUSHM1: "0x4F", // The number -1 is pushed onto the stack.
      PUSH1: "0x51", // The number 1 is pushed onto the stack.
      PUSHT: "PUSH1",
      PUSH2: "0x52", // The number 2 is pushed onto the stack.
      PUSH3: "0x53", // The number 3 is pushed onto the stack.
      PUSH4: "0x54", // The number 4 is pushed onto the stack.
      PUSH5: "0x55", // The number 5 is pushed onto the stack.
      PUSH6: "0x56", // The number 6 is pushed onto the stack.
      PUSH7: "0x57", // The number 7 is pushed onto the stack.
      PUSH8: "0x58", // The number 8 is pushed onto the stack.
      PUSH9: "0x59", // The number 9 is pushed onto the stack.
      PUSH10: "0x5A", // The number 10 is pushed onto the stack.
      PUSH11: "0x5B", // The number 11 is pushed onto the stack.
      PUSH12: "0x5C", // The number 12 is pushed onto the stack.
      PUSH13: "0x5D", // The number 13 is pushed onto the stack.
      PUSH14: "0x5E", // The number 14 is pushed onto the stack.
      PUSH15: "0x5F", // The number 15 is pushed onto the stack.
      PUSH16: "0x60", // The number 16 is pushed onto the stack.
      NOP: "0x61", // Does nothing.
      JMP: "0x62",
      JMPIF: "0x63",
      JMPIFNOT: "0x64",
      CALL: "0x65",
      RET: "0x66",
      APPCALL: "0x67",
      SYSCALL: "0x68",
      TAILCALL: "0x69",
      DUPFROMALTSTACK: "0x6A",
      TOALTSTACK: "0x6B", // Puts the input onto the top of the alt stack. Removes it from the main stack.
      FROMALTSTACK: "0x6C", // Puts the input onto the top of the main stack. Removes it from the alt stack.
      XDROP: "0x6D",
      XSWAP: "0x72",
      XTUCK: "0x73",
      DEPTH: "0x74", // Puts the number of stack items onto the stack.
      DROP: "0x75", // Removes the top stack item.
      DUP: "0x76", // Duplicates the top stack item.
      NIP: "0x77", // Removes the second-to-top stack item.
      OVER: "0x78", // Copies the second-to-top stack item to the top.
      PICK: "0x79", // The item n back in the stack is copied to the top.
      ROLL: "0x7A", // The item n back in the stack is moved to the top.
      ROT: "0x7B", // The top three items on the stack are rotated to the left.
      SWAP: "0x7C", // The top two items on the stack are swapped.
      TUCK: "0x7D", // The item at the top of the stack is copied and inserted before the second-to-top item.
      CAT: "0x7E", // Concatenates two strings.
      SUBSTR: "0x7F", // Returns a section of a string.
      LEFT: "0x80", // Keeps only characters left of the specified point in a string.
      RIGHT: "0x81", // Keeps only characters right of the specified point in a string.
      SIZE: "0x82", // Returns the length of the input string.
      INVERT: "0x83", // Flips all of the bits in the input.
      AND: "0x84", // Boolean and between each bit in the inputs.
      OR: "0x85", // Boolean or between each bit in the inputs.
      XOR: "0x86", // Boolean exclusive or between each bit in the inputs.
      EQUAL: "0x87", // Returns 1 if the inputs are exactly equal", 0 otherwise.
      INC: "0x8B", // 1 is added to the input.
      DEC: "0x8C", // 1 is subtracted from the input.
      SIGN: "0x8D",
      NEGATE: "0x8F", // The sign of the input is flipped.
      ABS: "0x90", // The input is made positive.
      NOT: "0x91", // If the input is 0 or 1", it is flipped. Otherwise the output will be 0.
      NZ: "0x92", // Returns 0 if the input is 0. 1 otherwise.
      ADD: "0x93", // a is added to b.
      SUB: "0x94", // b is subtracted from a.
      MUL: "0x95", // a is multiplied by b.
      DIV: "0x96", // a is divided by b.
      MOD: "0x97", // Returns the remainder after dividing a by b.
      SHL: "0x98", // Shifts a left b bits", preserving sign.
      SHR: "0x99", // Shifts a right b bits", preserving sign.
      BOOLAND: "0x9A", // If both a and b are not 0", the output is 1. Otherwise 0.
      BOOLOR: "0x9B", // If a or b is not 0", the output is 1. Otherwise 0.
      NUMEQUAL: "0x9C", // Returns 1 if the numbers are equal", 0 otherwise.
      NUMNOTEQUAL: "0x9E", // Returns 1 if the numbers are not equal", 0 otherwise.
      LT: "0x9F", // Returns 1 if a is less than b", 0 otherwise.
      GT: "0xA0", // Returns 1 if a is greater than b", 0 otherwise.
      LTE: "0xA1", // Returns 1 if a is less than or equal to b", 0 otherwise.
      GTE: "0xA2", // Returns 1 if a is greater than or equal to b", 0 otherwise.
      MIN: "0xA3", // Returns the smaller of a and b.
      MAX: "0xA4", // Returns the larger of a and b.
      WITHIN: "0xA5", // Returns 1 if x is within the specified range (left-inclusive)", 0 otherwise.
      SHA1: "0xA7", // The input is hashed using SHA-1.
      SHA256: "0xA8", // The input is hashed using SHA-256.
      HASH160: "0xA9",
      HASH256: "0xAA",
      CHECKSIG: "0xAC",
      CHECKMULTISIG: "0xAE",
      ARRAYSIZE: "0xC0",
      PACK: "0xC1",
      UNPACK: "0xC2",
      PICKITEM: "0xC3",
      SETITEM: "0xC4",
      NEWARRAY: "0xC5", //用作引用類型
      NEWSTRUCT: "0xC6", //用作值類型
      THROW: "0xF0",
      THROWIFNOT: "0xF1"
    };
  }
})(window);