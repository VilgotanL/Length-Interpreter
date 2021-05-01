//this file is noice


async function brainfuckToLength(code) {
    //remove non-brainfuck characters
    code = code.split("").reduce((prev, curr) => "+-<>.,[]".includes(curr) ? prev + curr : prev, "");

    let lineLengths = []; //output program in line lengths
    lineLengths.push("push", 420, "push", 0); //initial code (separator and initial memory cell)

    let loopIdStack = []; //stack for label ids for the [ and ] loops

    let currId = -1; //negative numbers in lineLengths means labels
    function getId() {
        return currId--;
    }
    function defineLabel(id) {
        let lineNum = lineLengths.length;
        for(let i = 0; i < lineLengths.length; i++) {
            if(lineLengths[i] === id) lineLengths[i] = lineNum;
        }
        return lineNum;
    }
    function ifEqGotou(id) {
        lineLengths.push("sub", "cond", "gotou");
        lineLengths.push(lineLengths.length + 3);
        lineLengths.push("gotou", id) //else
    }

    await sleep(0); //prevent freeze as much as possible

    //main loop
    for(let i = 0; i < code.length; i++) {
        if(code[i] === "+") {
            let afterId = getId();
            let overflowedId = getId();
            lineLengths.push("push", 1, "add", "dup", "push", 256);
            //ifeq_gotou overflowedId
            ifEqGotou(overflowedId);

            lineLengths.push("gotou", afterId);
            overflowedId = defineLabel(overflowedId);
            lineLengths.push("pop", "push", 0);
            afterId = defineLabel(afterId);
        } else if(code[i] === "-") {
            let afterId = getId();
            let overflowedId = getId();
            lineLengths.push("push", 1, "sub", "dup", "push", 0, "push", 1, "sub");
            //ifeq_gotou overflowedId
            ifEqGotou(overflowedId);

            lineLengths.push("gotou", afterId);
            overflowedId = defineLabel(overflowedId);
            lineLengths.push("pop", "push", 255);
            afterId = defineLabel(afterId);
        } else if(code[i] === ">") {
            let equalsId = getId();
            let afterId = getId();
            lineLengths.push("ror", "dup", "push", 420);
            ifEqGotou(equalsId);
            lineLengths.push("gotou", afterId);
            equalsId = defineLabel(equalsId);
            lineLengths.push("rol", "push", 0);
            afterId = defineLabel(afterId);
        } else if(code[i] === "<") {
            lineLengths.push("rol");
        } else if(code[i] === ".") {
            lineLengths.push("dup", "outa");
        } else if(code[i] === ",") {
            lineLengths.push("pop", "inp");
        } else if(code[i] === "[") {
            let isZeroId = getId();
            let afterId = getId(); //for [
            let afterId2 = getId(); //for ], will be defined at ]
            lineLengths.push("push", 0);
            ifEqGotou(isZeroId);
            lineLengths.push("gotou", afterId);
            isZeroId = defineLabel(isZeroId);
            lineLengths.push(afterId2);
            afterId = defineLabel(afterId);

            loopIdStack.push(afterId, afterId2);
        } else if(code[i] === "]") {
            let [afterId2, afterId] = [loopIdStack.pop(), loopIdStack.pop()];
            if(afterId === undefined || afterId2 === undefined) err("Error while transpiling from brainfuck: Not enough [");

            lineLengths.push("dup", "push", 0);
            ifEqGotou(afterId2);
            lineLengths.push("gotou", afterId);
            afterId2 = defineLabel(afterId2);
        }
    }

    if(loopIdStack.length !== 0) err("Error while transpiling from brainfuck: Not enough ]");

    await sleep(0); //prevent freeze as much as possible

    //turn "pop" into line_lengths["pop"]
    for(let i = 0; i < lineLengths.length; i++) {
        if(typeof lineLengths[i] === "string") {
            lineLengths[i] = instr_lengths[lineLengths[i]];
        }
    }

    //turn line lengths into code
    let generatedCode = "";
    for(let i = 0; i < lineLengths.length; i++) {
        generatedCode += getNumberedLine(lineLengths[i]) + "\n";
    }

    return generatedCode;
}

