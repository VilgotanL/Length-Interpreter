function generateFromString(str) {
    let code = "";
    
    for(let i = 0; i < str.length; i++) {
        let id = str.charCodeAt(i);
        code += "push\n" + id + "\nouta\n";
    }
    code = code.substring(0, code.length-1); //remove last newline
    return code;
}

function assemble(code) {
    let lines = code.split("\n");
    let newLines = [];

    for(let i = 0; i < lines.length; i++) {
        let line = lines[i].trim().split("#")[0].trim(); //allow for #comments and indentation
        let n = Math.floor(Number(line));
        if(instr_lengths.hasOwnProperty(line) && typeof instr_lengths[line] !== "string") {
            newLines.push("a".repeat(instr_lengths[line]));
        } else if(!isNaN(n)) {
            newLines.push("a".repeat(n));
        } else {
            newLines.push("a".repeat(line.length));
        }
    }

    //convert aaaaa to 12345
    for(let i = 0; i < newLines.length; i++) {
        let line = newLines[i].split("");
        for(let j = 0; j < line.length; j++) {
            let numStr = (""+(j+1));
            line[j] = numStr[numStr.length-1];
        }
        newLines[i] = line.join("");
    }

    return newLines.join("\n");
}

function disassemble(code) {
    let lines = code.split("\n");
    let newLines = [];

    for(let i = 0; i < lines.length; i++) {
        let line = lines[i].length;
        if(instr_lengths.hasOwnProperty(line) && typeof instr_lengths[line] !== "number" && newLines[newLines.length-1] !== "push" && newLines[newLines.length-1] !== "gotou") {
            newLines.push(instr_lengths[line]);
        } else {
            newLines.push(""+line);
        }
    }

    return newLines.join("\n");
}