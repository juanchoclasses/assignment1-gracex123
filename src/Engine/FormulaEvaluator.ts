import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

    /**
   * a helper function of evaluate the formula
   * @param formula
   * @returns the result of the formula
   */
  evaluateHelper(formula: FormulaType): number {
    const len: number = formula.length;
    const formulaStack: number[] = [];
    let num: number = 0.0;
    this._errorMessage = "";
    let res: number = 0;
    let operator: string = "+";

    if (len === 0) {
      this._errorOccured = true;
      this._errorMessage = ErrorMessages.emptyFormula;

      return 0;
    }

    for (let i: number = 0; i < len; i++) {
      const token: string = formula[i];

      // check if it is a decimal number, if so parse it to float
      if (/^[\d.]+$/.test(token)) { 
        num = parseFloat(token);
      }

      // check if this cell contains reference, if so, get the cell value and error(if has) 
      if (this.isCellReference(token)) {
        let [value, err] = this.getCellValue(token);
        if (err !== "") {
            this._errorMessage = err;
            this._errorOccured = true;
            return 0;
        }
        num = value;
      }

      // if the token is '('
      if (token === '(') {
        if (i === len - 1) {
          this._errorOccured = true;
          this._errorMessage = ErrorMessages.invalidFormula;
          return num;
        }
        
        if (formula[i + 1] === ')') {
          this._errorMessage = ErrorMessages.missingParentheses;
          this._errorOccured = true;
          return 0;
        }

        let j: number;
        let parenthesesStack: string[] = ['('];

        for (j = i + 1; j < len; j++) {
          if (formula[j] === '(') {
            parenthesesStack.push('(');
          } 
          if (formula[j] === ')') {
            parenthesesStack.pop();
          } 
          if (parenthesesStack.length === 0) {
            break;
          }
        }


        num = this.evaluateHelper(formula.slice(i + 1, j));
        i = j;
      }

      if ((i === (len-1)) || 
          token === '+' ||
          token === '-' ||
          token === '*' ||
          token === '/') {
          switch (operator) {
            case '+':
                formulaStack.push(num);
                break;
            case '-':
                formulaStack.push(-num);
                break;
            case '*':
                formulaStack.push(formulaStack.pop()! * num);
                break;
            case '/':
              // if the divisor is zero return divideByZero error
                if(num === 0){
                  this._errorOccured = true;
                  this._errorMessage = ErrorMessages.divideByZero;
                  return Infinity;
                }
                formulaStack.push(formulaStack.pop()! / num);
                break;
        }
        num = 0.0;
        operator = token;
        }

      }

      if (['+', '-', '*', '/'].includes(formula[len-1])) {
        this._errorOccured = true;
        this._errorMessage = ErrorMessages.invalidFormula;

      }


      while (formulaStack.length > 0) {
        res += formulaStack.pop()!;
      }

      return res;

  }


  /**
   * evaluate the formula
   * @param formula
   * @returns the result of the formula
  **/
  evaluate(formula: FormulaType) {

    this._result = this.evaluateHelper(formula);
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }


  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;