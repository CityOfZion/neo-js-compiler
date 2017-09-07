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
    };
  }

  function neoParser() {
    return {
      parse: function (jsSource) {
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
                cleanStack.stack.push({code: fnStack[n].bytes[m]});
              }
            }
          }

          neo.methods[i].byteCodeAddress = currentAddress;
          currentAddress += cleanStack.stack.length;
          console.log('current: %d / method: %d', currentAddress, neo.methods[i].byteCodeAddress);

          byteCode = byteCode.concat(cleanStack.stack);
        }

        let byteCodeOutput = [];
        for (let n = 0; n < byteCode.length; n++) {
          if (byteCode[n].fixAddress === true) {
            // opCodes.CALL requires address rewrite after stack is determined
            let targetAddress = neo.methods[byteCode[n].targetAddress.methodName].byteCodeAddress;
            console.error('%s target address is %s / n is %d / %d (%s)', byteCode[n].targetAddress.methodName, targetAddress, n, targetAddress - n, this.IntToHex(targetAddress - n));
            // this is a pretty hacky way to work out the new address for the called method.. but it works..
            let newAddress = this.HexByteArrayNumBits([this.IntToHex(targetAddress - n, false)], 2);
            byteCode[n + 1].code = '0x' + newAddress[0];
            byteCode[n + 2].code = '0x' + newAddress[1];
          }
          byteCodeOutput.push(byteCode[n].code);
        }

        let jsByteCode = byteCodeOutput.join(" ").toLowerCase().replace(new RegExp('0x', 'g'), '');
        let bcDiv = document.getElementById('byteCode');
        let csByteCode = "53 c5 6b 61 04 61 61 61 61 6c 76 6b 00 52 7a c4 04 62 62 62 62 6c 76 6b 51 52 7a c4 02 d7 03 6c 76 6b 52 52 7a c4 6c 76 6b 00 c3 61 65 54 00 75 6c 76 6b 00 c3 6c 76 6b 51 c3 61 7c 65 67 00 75 04 63 63 63 63 61 65 3a 00 75 6c 76 6b 00 c3 04 64 64 64 64 61 7c 65 4d 00 75 61 65 72 00 75 61 65 89 00 75 6c 76 6b 52 c3 61 65 9a 00 75 03 ec a8 00 61 65 91 00 75 61 65 af 00 75 61 6c 75 66 52 c5 6b 6c 76 6b 00 52 7a c4 61 6c 76 6b 00 c3 6c 76 6b 51 52 7a c4 62 03 00 6c 76 6b 51 c3 61 6c 75 66 53 c5 6b 6c 76 6b 00 52 7a c4 6c 76 6b 51 52 7a c4 61 6c 76 6b 51 c3 6c 76 6b 52 52 7a c4 62 03 00 6c 76 6b 52 c3 61 6c 75 66 51 c5 6b 61 04 74 65 73 74 6c 76 6b 00 52 7a c4 62 03 00 6c 76 6b 00 c3 61 6c 75 66 51 c5 6b 61 61 65 df ff 6c 76 6b 00 52 7a c4 62 03 00 6c 76 6b 00 c3 61 6c 75 66 52 c5 6b 6c 76 6b 00 52 7a c4 61 6c 76 6b 00 c3 6c 76 6b 51 52 7a c4 62 03 00 6c 76 6b 51 c3 61 6c 75 66 51 c5 6b 61 01 20 6c 76 6b 00 52 7a c4 62 03 00 6c 76 6b 00 c3 61 6c 75 66";
        csByteCode = csByteCode.trim();
        if (csByteCode === '') {
          return;
        }

        document.getElementById('byteCodeOutput').innerHTML = jsByteCode;
        let diff = new Diff();
        let textDiff = diff.main(csByteCode, jsByteCode);
        if (jsByteCode !== csByteCode) {
          bcDiv.innerHTML += diff.prettyHtml(textDiff) + '<br />'
        }
        bcDiv.innerHTML += csByteCode;
      },

      FunctionDeclaration: function (node, justInitFunctionDeclarations) {
        console.log('FunctionDeclaration(%s) called: %s (range: %s)', justInitFunctionDeclarations, node.id.name, JSON.stringify(this.NodeRange(node)));

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
            operations: [],
            stack: [],
          };

          for (let n = 0; n < node.params.length; n++) {
            let functionParamObject = {
              name: node.params[n].name,
              pos: n,
              isFunctionArgument: true,
              wasUsed: false,
            };
            neo.methods[node.id.name].functionArguments.push(functionParamObject);
            neo.methods[node.id.name].functionVariables[node.params[n].name] = functionParamObject;
          }

          this.FunctionDefinitionFinder(neo.methods[node.id.name], node.body);
          return;
        }

        let functionStack = neo.methods[node.id.name];
        //_insertBeginCode
        console.error('%s has %d vars', functionStack.methodName, functionStack.totalVars);
        this.InsertPushNumber(functionStack, (functionStack.totalVars + functionStack.totalFunctionArgs));
        this.InsertPushOne(functionStack, opCodes.NEWARRAY);
        this.InsertPushOne(functionStack, opCodes.TOALTSTACK);

        for (let n = 0; n < functionStack.totalFunctionArgs; n++) {
          this.InsertPushOne(functionStack, opCodes.FROMALTSTACK);
          this.InsertPushOne(functionStack, opCodes.DUP);
          this.InsertPushOne(functionStack, opCodes.TOALTSTACK);
          this.InsertPushNumber(functionStack, n);
          this.InsertPushNumber(functionStack, 2);
          this.InsertPushOne(functionStack, opCodes.ROLL);
          this.InsertPushOne(functionStack, opCodes.SETITEM);
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
        for (let n = 0; n < functionStack.stack.length; n++) {
          let stackItem = functionStack.stack[n];
          if (stackItem.fixAddress && stackItem.code !== opCodes.CALL) {
            let sourceAddress = stackItem.sourceAddress + 1;// + 2;
            let addressOffset = functionStack.addressConvert[sourceAddress] - stackItem.address;
            stackItem.bytes = this.HexByteArrayNumBits([this.IntToHex(addressOffset)], 2);
            stackItem.fixAddress = false;
            console.log('addr=%d, src=%d, offset=%d', functionStack.addressConvert[sourceAddress], sourceAddress, addressOffset);
          }
        }
        //ConvertAddrInMethod end
      },

      /**
       * scan this function looking for any kind of 'return' statement - required to add a DROP to stack after calling
       * @param parentMethod
       * @param node
       * @constructor
       */
      FunctionDefinitionFinder: function (parentMethod, node) {
        console.log('FunctionDefinitionFinder()');
        for (let n = 0; n < node.body.length; n++) {
          if (node.body[n].type === "ReturnStatement") {
            if (node.body[n].expression !== null) {
              parentMethod.totalVars++;
            }
            parentMethod.hasReturnStatement = true;
            return;
          }
          if (node.body[n].type === 'VariableDeclaration') {
            parentMethod.totalVars += node.body[n].declarations.length;
          }
        }
      },

      BlockStatement: function (parentMethod, node) {
        console.log('BlockStatement() called (range: %s)', JSON.stringify(this.NodeRange(node)));

        // this.StackPushCode(parentMethod, opCodes.NOP, true);
        this.ConvertPushOne(parentMethod, opCodes.NOP, parentMethod.sourceOperations++);

        for (let i = 0; i < node.body.length; i++) {
          let childNode = node.body[i];
          switch (childNode.type) {
            // case "FunctionDeclaration":
            //   this.FunctionDeclaration(childNode);
            //   break;
            case "VariableDeclaration":
              this.VariableDeclaration(parentMethod, childNode.declarations);
              break;
            case "ExpressionStatement":
              this.ExpressionStatement(parentMethod, childNode.expression);
              break;
            case "ReturnStatement":
              this.ReturnStatement(parentMethod, childNode.argument);
              break;
            default:
              console.error('BlockStatement() unhandled: %s', childNode.type);
          }
        }
      },

      ReturnStatement: function (parentMethod, expression) {
        console.error('ReturnStatement()');
        if (expression !== null) {
          this.VariableAssignment(parentMethod, expression);
        }

        let targetAddress = [this.IntToHex(0), this.IntToHex(0)];
        let code = this.ConvertPushOne(parentMethod, opCodes.JMP, parentMethod.sourceOperations++, targetAddress);
        code.fixAddress = true;
        code.sourceAddress = parentMethod.sourceOperations - 1;

        this.ConvertPushOne(parentMethod, opCodes.FROMALTSTACK, parentMethod.sourceOperations++);
        this.ConvertPushOne(parentMethod, opCodes.DUP);
        this.ConvertPushOne(parentMethod, opCodes.TOALTSTACK);
        this.ConvertPushNumber(parentMethod, (parentMethod.totalFunctionArgs + parentMethod.totalVars) - 1);
        this.ConvertPushOne(parentMethod, opCodes.PICKITEM);

      },

      ExpressionStatement: function (parentMethod, expression) {
        console.info('ExpressionStatement() called with expression: %s', expression.type);
        switch (expression.type) {
          case "CallExpression":
            this.CallExpression(parentMethod, expression);
            break;
          default:
            console.error('ExpressionStatement() unhandled: %s', expression.type);
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
              console.error('expression args');
              let expr = callExpression.arguments[i];
              switch (expr.type) {
                case "Identifier":
                  neo.methods[callExpression.callee.name].functionArguments[i].value = parentMethod.functionVariables[expr.name].value;
                  // neo.methods[callExpression.callee.name].functionArguments.push(parentMethod.functionVariables[expr.name]);
                  this.ConvertPushOne(parentMethod, opCodes.FROMALTSTACK, parentMethod.sourceOperations++);
                  this.ConvertPushOne(parentMethod, opCodes.DUP);
                  this.ConvertPushOne(parentMethod, opCodes.TOALTSTACK);
                  // this.ConvertPushNumber(parentMethod, identifiersAdded++ + parentMethod.totalFunctionArgs);
                  this.ConvertPushNumber(parentMethod, parentMethod.functionVariables[expr.name].pos + parentMethod.totalFunctionArgs);
                  this.ConvertPushOne(parentMethod, opCodes.PICKITEM);
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
                  }
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
        for (let i = 0; i < declarations.length; i++) {
          let varPosition = parentMethod.varCount;
          let returnValue = this.VariableAssignment(parentMethod, declarations[i].init);
          parentMethod.functionVariables[declarations[i].id.name] = {
            pos: varPosition,
            value: returnValue,
            isFunctionArgument: false,
            wasUsed: false,
          };
        }
      },

      VariableAssignment: function (parentMethod, variable) {
        console.error('VariableAssignment()');
        let returnValue = "";

        if (variable === null) {
          parentMethod.varCount++;
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
            }
            returnValue = variable.value;
            break;
          case "CallExpression":
            this.CallExpression(parentMethod, variable, true);
            break;
          case "Identifier":
            console.error("VariableAssignment().Identifier");
            let sourceVariable = parentMethod.functionVariables[variable.name];
            sourceVariable.wasUsed = true;
            returnValue = sourceVariable.value;
            this.ConvertPushOne(parentMethod, opCodes.FROMALTSTACK, parentMethod.sourceOperations++);
            this.ConvertPushOne(parentMethod, opCodes.DUP);
            this.ConvertPushOne(parentMethod, opCodes.TOALTSTACK);
            if (sourceVariable.isFunctionArgument) {
              // opcodes.ldArg
              this.ConvertPushNumber(parentMethod, sourceVariable.pos);
            } else {
              // opcodes.ldloc
              this.ConvertPushNumber(parentMethod, sourceVariable.pos + parentMethod.totalFunctionArgs);
            }
            this.ConvertPushOne(parentMethod, opCodes.PICKITEM);
            break;
          case "BinaryExpressionZZ":
            break;
          default:
            console.error('VariableAssignment() unhandled: %s', variable.type);
            return;
        }

        console.log('VariableAssignment() VariableDeclarator');
        this.ConvertPushOne(parentMethod, opCodes.FROMALTSTACK, parentMethod.sourceOperations++);
        this.ConvertPushOne(parentMethod, opCodes.DUP);
        this.ConvertPushOne(parentMethod, opCodes.TOALTSTACK);
        this.ConvertPushNumber(parentMethod, (parentMethod.varCount + parentMethod.totalFunctionArgs));
        this.ConvertPushNumber(parentMethod, 2);
        this.ConvertPushOne(parentMethod, opCodes.ROLL);
        this.ConvertPushOne(parentMethod, opCodes.SETITEM);

        parentMethod.varCount++;
        return returnValue;
      },

      ConvertPushOne: function (parentMethod, mCode, mSourceOperations = null, mExtraData = null) {
        console.error('ConvertPushOne() %s', mCode);
        let startAddress = parentMethod.address;

        let code = {
          address: parentMethod.address,
          code: mCode,
          debugCode: null,
          fixAddress: false,
          sourceAddress: 0,
          targetAddress: null,
        };

        if (mSourceOperations !== null) {
          if (mCode === opCodes.JMP) {
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
        if(typeof(mArray[0]) === 'object') {
          mArray = mArray[0];
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

        if(mNumber < 0) {
          return this.HexToByteArray((65535 + mNumber + 1).toString(16)).reverse();
        }

        let h = mNumber.toString(16);
        let val = h.length % 2 ? '0' + h : h;
        let msb = {8:1,9:1,a:1,b:1,c:1,d:1,e:1,f:1};
        if(useMSB && mNumber > 127 && typeof(msb[val.substr(0,1)]) !== 'undefined') {
          val = '00' + val;
        }
        return val;
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
