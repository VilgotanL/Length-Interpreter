let brainfuckToLength = (() => { //closures are nice
    //this file is quite messy, might refactor it later

    const instr_lengths = {"inp": 9, "add": 10, "sub": 11, "dup": 12, "cond": 13, "gotou": 14, "outn": 15, "outa": 16, "rol": 17, "swap": 18, "mul": 20, "div": 21, "pop": 23, "gotos": 24, "push": 25, "ror": 27};
    Object.keys(instr_lengths).forEach(function(key) { //for each key
        instr_lengths[instr_lengths[key]] = key;
    });


    function transpileToLength(code) {

        let getId = (() => {
            let id = 0;
            return function() {
                return id++;
            }
        })();

        let newCode = `#INIT
    push 420 #separator
    push 0 #initial memory

    `;

        let loopIds = [];
    
        for(let i = 0; i < code.length; i++) {
            let char = code[i];

            switch(char) {
                case "+": {
                    let overflowedId = getId();
                    let afterId = getId();
                    newCode += `#INCREMENT
    push 1
    add
    dup #check if overflow
    push 256
    ifeq_gotou @overflowed${overflowedId}
    gotou @after${afterId}
    @overflowed${overflowedId}:
    pop
    push 0
    @after${afterId}:

    `;
                    break;
                }
                case "-": {
                    let overflowedId = getId();
                    let afterId = getId();
                    newCode += `#DECREMENT
    push 1
    sub
    dup #check if overflow
    push 0
    push 1
    sub
    ifeq_gotou @overflowed${overflowedId}
    gotou @after${afterId}
    @overflowed${overflowedId}:
    pop
    push 255
    @after${afterId}:

    `;
                    break;
                }
                case ">": {
                    let equalsId = getId();
                    let afterId = getId();
                    newCode += `#MOVE RIGHT
    ror
    dup
    push 420
    ifeq_gotou @equals${equalsId}
    gotou @after${afterId}
    @equals${equalsId}:
    rol
    push 0
    @after${afterId}:

    `;
                    break;
                }
                case "<": {
                    newCode += `#MOVE LEFT
    rol

    `;
                    break;
                }
                case ".": {
                    newCode += `#OUTPUT
    dup
    outa

    `;
                    break;
                }
                case ",": {
                    newCode += `#INPUT
    pop
    inp

    `;
                    break;
                }
                case "[": {
                    let is0Id = getId();
                    let afterId = getId();
                    loopIds.push(afterId);
                    newCode += `#[
    dup #check if 0
    push 0
    ifeq_gotou @is_0${is0Id}
    gotou @after[${afterId}
    @is_0${is0Id}:
    gotou @after]${afterId}
    @after[${afterId}:
    `;
                    break;
                }
                case "]": {
                    let afterId = loopIds.pop();
                    if(afterId === undefined) err("loopIds.pop() got undefined (probably too many ])");
                    newCode += `#]
    dup #check if not 0
    push 0
    ifeq_gotou @after]${afterId}
    gotou @after[${afterId}
    @after]${afterId}:
    `;
                    break;
                }
            }
        }

        return specificTranspile(newCode);
    };

    function err(str) {
        outputEl.innerText = "Error while transpiling brainfuck to length (is the brainfuck code valid?)";
        throw new Error(str);
    }

    function specificTranspile(code) {
        let codeLinesMap = [];
        let lines = code.split("\n");
        let newLines = []; //list of generated code lengths

        for(let i = 0; i < lines.length; i++) {
            let line = lines[i].split("#")[0].trim(); //allow for #comments and indentation
            let parts = line.split(" ");

            if(line === "") { //ignore empty lines
                codeLinesMap.push(i);
                continue;
            }

            let instr = parts.shift().trim();
            let arg = parts.join(" ").trim();

            if(instr.startsWith("@") && instr.endsWith(":")) { //label
                newLines.push(instr); //push instr with @ and : as string
                codeLinesMap.push(i);
                continue;
            }
        
            if(instr === "gotou" || instr === "push") { //gotou or push (with instruction argument)
                newLines.push(instr_lengths[instr]);
                if(arg.startsWith("@")) newLines.push(arg);
                else newLines.push(toInt(arg, i));
                codeLinesMap.push(i, i); //since we push instruction and instructionn argument
            } else if(instr_lengths.hasOwnProperty(instr) && typeof instr_lengths[instr] === "number") { //normal length instruction
                newLines.push(instr_lengths[instr]);
                codeLinesMap.push(i);
            } else if(instr === "ifeq_gotou") {
                newLines.push(instr_lengths["sub"]); //subtract the two items
                newLines.push(instr_lengths["cond"]); //if not 0
                newLines.push(instr_lengths["gotou"]);
                newLines.push(newLines.length + 3); //skip the else
                newLines.push(instr_lengths["gotou"]); //else
                //push arg
                if(arg.startsWith("@")) newLines.push(arg);
                else newLines.push(toInt(arg, i));
                //update codeLinesMap
                codeLinesMap.push(i, i, i, i, i, i);
            } else {
                err("Error while assembling: invalid instruction at line "+i);
            }
        }

        let labels = new Map([]);
        //parse labels
        for(let i = 0; i < newLines.length; i++) {
            if(typeof newLines[i] === "string" && newLines[i].startsWith("@") && newLines[i].endsWith(":")) {
                labels.set(newLines[i].substring(1, newLines[i].length-1), i);
                newLines[i] = 0; //noop
            }
        }
        //evaluate labels
        for(let i = 0; i < newLines.length; i++) {
            if(typeof newLines[i] === "string" && newLines[i].startsWith("@")) {
                let n = labels.get(newLines[i].substring(1));
                if(n === undefined) err("Error while assembling: unknown label at line "+codeLinesMap[i]);
                newLines[i] = n;
            }
        }

        //convert line lengths to 12345
        let newCodeStr = "";
        for(let i = 0; i < newLines.length; i++) {
            let line = getNumberedLine(newLines[i]);
            newCodeStr += line+"\n";
        }
        newCodeStr = newCodeStr.substring(0, newCodeStr.length-1); //remove last newline

        return newCodeStr;
    }
    function toInt(str, lineNum) {
        let n = Number(str);

        if(!isFinite(n) || !str.trim()) err("Error while assembling: expected valid integer at line "+lineNum);
        if(n !== Math.floor(n)) err("Error while assembling: expected integer at line "+lineNum);
        if(n < 0) err("Error while assembling: expected not less than zero integer at line "+lineNum);

        return n;
    }
    function getNumberedLine(length) { //converts aaaaa to 12345
        let line = "";
        for(let j = 0; j < length; j++) {
            let numStr = (""+(j+1));
            line += numStr[numStr.length-1];
        }
        return line;
    }


    return transpileToLength;
})();