function getNumberedLine(length) { //converts aaaaa to 12345
    let line = "";
    for(let j = 0; j < length; j++) {
        let numStr = (""+(j+1));
        line += numStr[numStr.length-1];
    }
    return line;
}

function generateFromString(str) {
    let code = "";
    
    for(let i = 0; i < str.length; i++) {
        let id = str.charCodeAt(i);
        code += getNumberedLine(instr_lengths["push"]) + "\n";
        code += getNumberedLine(id) + "\n";
        code += getNumberedLine(instr_lengths["outa"]) + "\n";
    }
    code = code.substring(0, code.length-1); //remove last newline
    return code;
}

function toInt(str, lineNum) {
    let n = Number(str);

    if(!isFinite(n)) err("Error while assembling: expected valid integer at line "+lineNum);
    if(n !== Math.floor(n)) err("Error while assembling: expected integer at line "+lineNum);
    if(n < 0) err("Error while assembling: expected not less than zero integer at line "+lineNum);

    return n;
}
function fromEscapeCombination(c, lineNum) {
    if(c == "n") return "\n";
    else if(c == "t") return "\t";
    if(c == "\\") return "\\";
    if(c == '"') return '"';
    if(c == "'") return "'";
    if(c == "0") return "\0";
    else err("Error while assembling: unknown escape combination at line "+lineNum);
}

function transpile(code) {
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
        } else if(instr == "print") {
            if(!(arg.startsWith('"') && arg.startsWith('"'))) err("Error while assembling: print expected quotes around string");
            let unescapedStr = arg.substring(1, arg.length-1);
            let str = "";
            //parse escape sequences
            for(let j = 0; j < unescapedStr.length; j++) {
                if(unescapedStr[j] === "\\" && unescapedStr[j + 1] !== undefined) {
                    str += fromEscapeCombination(unescapedStr[j+1], i);
                    j++;
                } else {
                    str += unescapedStr[j];
                }
            }
            //generate code
            for(let j = 0; j < str.length; j++) {
                let charCode = str.charCodeAt(j) ?? 0;
                newLines.push(instr_lengths["push"]);
                newLines.push(charCode);
                newLines.push(instr_lengths["outa"]);
                codeLinesMap.push(i, i, i);
            }
        } else {
            err("Error while assembling: invalid instruction at line "+i);
        }
    }
    console.log(newLines);
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

    return [newCodeStr, codeLinesMap];
}

function detranspile(code) {
    /*let lines = code.split("\n");
    let newLines = [];

    for(let i = 0; i < lines.length; i++) {
        let line = lines[i].length;
        if(instr_lengths.hasOwnProperty(line) && typeof instr_lengths[line] === "string" && newLines[newLines.length-1] !== "push" && newLines[newLines.length-1] !== "gotou") {
            newLines.push(instr_lengths[line]);
        } else {
            newLines.push(""+line);
        }
    }

    return newLines.join("\n");*/
    return "Detranspiling is currently WIP!";
}