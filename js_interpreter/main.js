const root = document.documentElement;
const codeEl = document.getElementById("input");
const outputEl = document.getElementById("output");
const outputInfo = document.getElementById("output_info");
const lineNumsDiv = document.getElementById("line_nums")

const runBtn = document.getElementById("run_btn");
const assembleBtn = document.getElementById("assemble_btn");
const assembleAndRunBtn = document.getElementById("assemble_and_run_btn");
const disassembleBtn = document.getElementById("disassemble_btn");
const generateFromStringBtn = document.getElementById("generate_from_string_btn");

const debugCheckbox = document.getElementById("debug_checkbox");
const slowCheckbox = document.getElementById("slow_checkbox");

//instr_lengths["inp"] == 9, instr_lengths[9] == "inp"
const instr_lengths = {"inp": 9, "add": 10, "sub": 11, "dup": 12, "cond": 13, "gotou": 14, "outn": 15, "outa": 16, "rol": 17, "swap": 18, "mul": 20, "div": 21, "pop": 23, "gotos": 24, "push": 25, "ror": 27};
let highlightGreenLineNum = -1;

let debug = false;
let slow = false;

Object.keys(instr_lengths).forEach(function(key) { //for each key
    instr_lengths[instr_lengths[key]] = key;
});

function err(str) {
    info(str, false);
    setButtonsDisabled(false);
    throw new Error(str);
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}


async function run(code) {
    outputEl.innerText = "";
    let strLines = code.split("\n");
    let lines = []; //list of lengths of each line
    let stack = [];
    let pc = 0; //program counter

    for(let i = 0; i < strLines.length; i++) {
        lines.push(strLines[i].length);
    }

    function pop() {
        if(stack.length <= 0) err("Error: Stack underflow (at line "+(pc)+")"); //pc+1 because line numbers start with 1 but the program counter starts at 0
        return stack.pop();
    }

    if(debug) outputEl.innerText += "Starting at line "+(pc)+"\n";
    let iters = 0;
    while(pc < lines.length) {
        if(slow) {
            highlightGreenLineNum = pc;
            lineNumsUpdate();
            await sleep(200);
        } else if(iters % 10 === 0) await sleep(1);

        let instr = instr_lengths[lines[pc]];
        switch(instr) {
            case "inp": {
                let id = prompt("Input a character:").charCodeAt(0) || 0;
                stack.push(id);
                outputEl.innerText += String.fromCharCode(id)+"\n";
                break;
            }
            case "add": {
                stack.push(pop() + pop());
                break;
            }
            case "sub": {
                let [a, b] = [pop(), pop()];
                stack.push(b - a);
                break;
            }
            case "dup": {
                let a = pop();
                stack.push(a, a);
                break;
            }
            case "cond": {
                let a = pop();
                if(a === 0) {
                    pc++;
                    if(lines[pc] === instr_lengths["gotou"] || lines[pc] === instr_lengths["push"]) { //if skipped line is gotou or push skip the instruction argument too
                        pc++;
                    }
                }
                break;
            }
            case "gotou": {
                if(lines[pc + 1] === undefined) err("Error: expected instruction argument after gotou (at line "+(pc)+")");
                pc = lines[pc + 1] - 1;
                let prevPc = pc;
                if(pc < -1) err("Error: cannot goto line "+(pc)+" (at line "+(prevPc)+")");
                break;
            }
            case "outn": {
                outputEl.innerText += pop().toString();
                break;
            }
            case "outa": {
                outputEl.innerText += String.fromCharCode(pop()) ?? "\0";
                break;
            }
            case "rol": {
                stack.unshift(pop()); //pops top of stack and pushes it to the back/bottom
                break;
            }
            case "swap": {
                let [a, b] = [pop(), pop()]; //pop a then b (a above b)
                stack.push(a, b); //push a then b (a below b)
                break;
            }
            case "mul": {
                stack.push(pop() * pop());
                break;
            }
            case "div": {
                let [a, b] = [pop(), pop()]; //pop a then b
                stack.push(b / a); //push b / a
                break;
            }
            case "pop": {
                pop();
                break;
            }
            case "gotos": {
                pc = pop();
                break;
            }
            case "push": {
                if(lines[pc + 1] === undefined) err("Error: expected instruction argument after push (at line "+(pc)+")");
                stack.push(lines[pc + 1]);
                pc++;
                break;
            }
            case "ror": {
                if(stack.length < 1) err("Error: Stack underflow (at line "+(pc)+")");
                stack.push(stack.shift(0)); //removes bottom of stack and pushes it to the top
                break;
            }
        }
        pc++;
        iters++;

        if(debug) if(pc < lines.length) outputEl.innerText += "\nNow at line "+(pc)+", stack (right=top): ["+(stack.toString())+"]\n";
    }
    highlightGreenLineNum = -1;
    lineNumsUpdate();
    if(debug) outputEl.innerText += "\nEnded at line "+(pc - 1)+"\n";
}



function info(str, isGreen) {
    outputInfo.innerText = str;
    if(outputInfo.classList.contains("output_info_green")) {
        outputInfo.classList.remove("output_info_green");
    }else if(outputInfo.classList.contains("output_info_red")) {
        outputInfo.classList.remove("output_info_red");
    }
    if(isGreen) outputInfo.classList.add("output_info_green");
    else outputInfo.classList.add("output_info_red");
}

runBtn.addEventListener("click", async function() {
    setButtonsDisabled(true);
    info("Running...", true);

    let code = codeEl.value;

    await run(code);

    info("Ran successfully!", true);
    setButtonsDisabled(false);
});
assembleBtn.addEventListener("click", async function() {
    setButtonsDisabled(true);
    info("Assembling...", true);

    let code = codeEl.value;

    let assembled = assemble(code);
    outputEl.innerText = assembled;

    info("Assembled successfully!", true);
    setButtonsDisabled(false);
});
assembleAndRunBtn.addEventListener("click", async function() {
    setButtonsDisabled(true);
    info("Assembling...", true);

    let code = codeEl.value;

    let assembled = assemble(code);
    info("Running...", true);
    await run(assembled);

    info("Assembled and ran successfully!", true);
    setButtonsDisabled(false);
});
disassembleBtn.addEventListener("click", async function() {
    setButtonsDisabled(true);
    info("Disassembling...", true);

    let code = codeEl.value;

    let disassembled = disassemble(code);
    outputEl.innerText = disassembled;

    info("Disassembled successfully!", true);
    setButtonsDisabled(false);
});
generateFromStringBtn.addEventListener("click", async function() {
    setButtonsDisabled(true);
    info("Generating from string...", true);

    let input = codeEl.value;

    let generated = generateFromString(input);
    outputEl.innerText = generated;

    info("Generated code from string successfully!", true);
    setButtonsDisabled(false);
});

debugCheckbox.addEventListener("change", function() {
    debug = debugCheckbox.checked;
});
slowCheckbox.addEventListener("change", function() {
    slow = slowCheckbox.checked;
});


function setButtonsDisabled(bool) {
    runBtn.disabled = bool;
    assembleBtn.disabled = bool;
    assembleAndRunBtn.disabled = bool;
    disassembleBtn.disabled = bool;
    generateFromStringBtn.disabled = bool;
}

function lineNumsUpdate() {
    let lines = codeEl.value.split("\n").length;
    
    //set width
    let ch = (""+lines).length;
    if(ch < 2) ch = 2; //minimum 2 chars of space
    root.style.setProperty("--line_nums_width", ch + "ch");

    lineNumsDiv.innerText = "";
    for(let i = 0; i < lines; i++) {
        let str = (""+(i)).padStart(ch, " ") + " " + "\n";
        if(i === highlightGreenLineNum) {
            str = '<span class="line_nums_span">'+str+'</span>';
        }
        lineNumsDiv.innerHTML += str;
    }

    lineNumsDiv.scrollTop = codeEl.scrollTop;
}
codeEl.addEventListener("input", lineNumsUpdate); //when codeEl.value changes
codeEl.addEventListener("scroll", function() {
    lineNumsDiv.scrollTop = codeEl.scrollTop;
});
function codeElResized() {
    lineNumsDiv.style.height = codeEl.style.height;
}
window.addEventListener("mousemove", codeElResized);

//search params ?file=program.len
const searchParams = new URLSearchParams(window.location.search);
let filePath = searchParams.get("file");
if(filePath) {
    fetch(`../examples/${filePath}`).then((response) => response.text()).then((text) => {
        codeEl.value = text;
        lineNumsUpdate();
        console.log("got response");
    });
}
