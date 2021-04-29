const root = document.documentElement;
const codeEl = document.getElementById("input");
const outputEl = document.getElementById("output");
const outputInfo = document.getElementById("output_info");
const lineNumsDiv = document.getElementById("line_nums");
const stackDiv = document.getElementById("stack_div");
const notRunningBtnsDiv = document.getElementById("btns_div_notrunning");
const runningBtnsDiv = document.getElementById("btns_div_running");

const runBtn = document.getElementById("run_btn");
const transpileBtn = document.getElementById("transpile_btn");
const transpileAndRunBtn = document.getElementById("transpile_and_run_btn");
const detranspileBtn = document.getElementById("detranspile_btn");
const generateFromStringBtn = document.getElementById("generate_from_string_btn");

const stopButton = document.getElementById("stop_btn");
const pauseButton = document.getElementById("pause_btn");
const stepButton = document.getElementById("step_btn");

const debugCheckbox = document.getElementById("debug_checkbox");
const slowCheckbox = document.getElementById("slow_checkbox");
const showStackCheckbox = document.getElementById("show_stack_checkbox");
const pauseWhenStartedCheckbox = document.getElementById("pause_when_ran_checkbox");

//instr_lengths["inp"] == 9, instr_lengths[9] == "inp"
const instr_lengths = {"inp": 9, "add": 10, "sub": 11, "dup": 12, "cond": 13, "gotou": 14, "outn": 15, "outa": 16, "rol": 17, "swap": 18, "mul": 20, "div": 21, "pop": 23, "gotos": 24, "push": 25, "ror": 27};
let highlightGreenLineNum = -1;

let debug = false;
let slow = false;
let showStack = true;

let paused = false;
let step = false;
let stopCount = 0; //gets incremented each time stopped, prevents stopping and starting quickly while slow=true breaking the interpreter


Object.keys(instr_lengths).forEach(function(key) { //for each key
    instr_lengths[instr_lengths[key]] = key;
});

function err(str) {
    info(str, false);
    setNotRunningButtonsDisabled(false);
    setRunning(false);
    throw new Error(str);
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function sleepUntilUnpausedOrStepped(initialStopCount) { //also returns when stopped
    return new Promise(async (r) => {
        while(true) {
            await sleep(10);
            if(step) {
                step = false;
                r();
                break; //just in case promises are weird
            } else if(paused === false) {
                r();
                break;
            } else if(stopCount !== initialStopCount) {
                r();
                break;
            }
        }
    });
}


async function run(code, codeLineMap) { //codeLineMap is a list of codeEL line numbers for which the transpiled lines map to
    if(!codeLineMap) {
        codeLineMap = code.split("\n").map((str, i) => i);
    }

    outputEl.innerText = "";
    setRunning(true);
    setPaused(pauseWhenStartedCheckbox.checked);

    let initialStopCount = stopCount; //if stopCount !== initialStopCount then the user clicked stop

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
    if(showStack) stackUpdate(stack);
    let iters = 0;
    while(pc < lines.length) {

        if(slow) {
            highlightGreenLineNum = codeLineMap[pc];
            lineNumsUpdate();
        }
        if(stopCount !== initialStopCount) break; //stop if we clicked stop button
        else if(paused) {
            highlightGreenLineNum = codeLineMap[pc];
            lineNumsUpdate();
            stackUpdate(stack);
            await sleepUntilUnpausedOrStepped(initialStopCount);
            if(stopCount !== initialStopCount) break; //break if stopped when paused
            if(!paused && !slow) {
                highlightGreenLineNum = -1;
                lineNumsUpdate();
                stackUpdate([]);
            }
        }

        let instr = instr_lengths[lines[pc]];
        switch(instr) {
            case "inp": {
                let id = (prompt("Input a character:") ?? "").charCodeAt(0) || 0;
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
        if((paused || slow) && showStack) stackUpdate(stack);
        if(slow && !paused) { //if slow and not paused (to allow stepping to be faster than 200ms)
            await sleep(200);
        } else if (iters % 10 === 0) await sleep(1);

        pc++;
        iters++;
        if(debug) if(pc < lines.length) outputEl.innerText += "\nNow at line "+(pc)+", stack (right=top): ["+(stack.toString())+"]\n";
    }
    highlightGreenLineNum = -1;
    lineNumsUpdate();
    if(showStack) stackUpdate(stack);
    if(debug) outputEl.innerText += "\nEnded at line "+(pc - 1)+"\n";

    setRunning(false);
    setPaused(false);
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
    setNotRunningButtonsDisabled(true);
    info("Running...", true);

    let code = codeEl.value;

    await run(code);

    info("Ran successfully!", true);
    setNotRunningButtonsDisabled(false);
});
transpileBtn.addEventListener("click", async function() {
    setNotRunningButtonsDisabled(true);
    info("Transpiling...", true);

    let code = codeEl.value;

    let [transpiled, codeLineMap] = transpile(code);
    outputEl.innerText = transpiled;

    info("Transpiled successfully!", true);
    setNotRunningButtonsDisabled(false);
});
transpileAndRunBtn.addEventListener("click", async function() {
    setNotRunningButtonsDisabled(true);
    info("Transpiling...", true);

    let code = codeEl.value;

    let [transpiled, codeLineMap] = transpile(code);
    info("Running...", true);
    await run(transpiled, codeLineMap);

    info("Transpiled and ran successfully!", true);
    setNotRunningButtonsDisabled(false);
});
detranspileBtn.addEventListener("click", async function() {
    setNotRunningButtonsDisabled(true);
    info("Detranspiling...", true);

    let code = codeEl.value;

    let detranspiled = detranspile(code);
    outputEl.innerText = detranspiled;

    info("Detranspiled successfully!", true);
    setNotRunningButtonsDisabled(false);
});
generateFromStringBtn.addEventListener("click", async function() {
    setNotRunningButtonsDisabled(true);
    info("Generating from string...", true);

    let input = codeEl.value;

    let generated = generateFromString(input);
    outputEl.innerText = generated;

    info("Generated code from string successfully!", true);
    setNotRunningButtonsDisabled(false);
});

//stop, pause, step
stopButton.addEventListener("click", async function() {
    stopCount++;
    info("Stopped!", true);
});
function setPaused(bool) {
    paused = bool;
    if(paused) {
        stepButton.disabled = false;
        pauseButton.innerText = "Continue";
        info("Paused!", true);
    } else {
        stepButton.disabled = true;
        pauseButton.innerText = "Pause";
        step = false; //just in case
        info("Running...", true);
    }
}
pauseButton.addEventListener("click", async function() {
    setPaused(!paused);
});
stepButton.addEventListener("click", async function() {
    step = true; //in sleepUntilUnpausedOrStepped we wait for step to be true and then set it to false
    info("Stepped!", true);
});
setPaused(false);

debugCheckbox.addEventListener("change", function() {
    debug = debugCheckbox.checked;
});
slowCheckbox.addEventListener("change", function() {
    slow = slowCheckbox.checked;
});
showStackCheckbox.addEventListener("change", function() {
    showStack = showStackCheckbox.checked;
    if(!showStack) {
        stackDiv.style.display = "none";
    } else {
        stackDiv.style.display = "block";
    }
});


function setNotRunningButtonsDisabled(bool) {
    runBtn.disabled = bool;
    transpileBtn.disabled = bool;
    transpileAndRunBtn.disabled = bool;
    detranspileBtn.disabled = bool;
    generateFromStringBtn.disabled = bool;
}
function setRunning(bool) {
    if(bool) {
        notRunningBtnsDiv.style.display = "none";
        runningBtnsDiv.style.display = "block";
    } else {
        notRunningBtnsDiv.style.display = "block";
        runningBtnsDiv.style.display = "none";
    }
}
setRunning(false);

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
function codeUpdate() {
    lineNumsUpdate();

    //update window.location.hash to encoded code
    let encoded = codeEl.value;
    window.location.hash = "#"+encodeURIComponent(encoded);
}
codeEl.addEventListener("input", codeUpdate); //when codeEl.value changes
codeEl.addEventListener("scroll", function() {
    lineNumsDiv.scrollTop = codeEl.scrollTop;
});
function codeElResized() {
    lineNumsDiv.style.height = codeEl.style.height;
}
window.addEventListener("mousemove", codeElResized);

//stack
function stackUpdate(stack) {
    stackDiv.innerHTML = "";
    for(let i = 0; i < stack.length; i++) {
        stackDiv.innerHTML += `<div class="stack_item"><div class="stack_item_inner">${stack[i]}</div></div>`;
    }
}
stackUpdate([]);

//search params ?file=program.len
const searchParams = new URLSearchParams(window.location.search);
let filePath = searchParams.get("file");

async function fetchFile(file) {
    try {
        let response = await fetch(file);
        let text = await response.text();
        codeEl.value = text;
        codeUpdate();
        console.log("fetched response successfully");
    } catch(e) {
        console.log("error while fetching: "+e);
    }
}
if(window.location.hash) {
    //decode window.location.hash
    let decoded = decodeURIComponent(window.location.hash.substring(1));
    codeEl.value = decoded;
    codeUpdate();
} else if(filePath) {
    fetchFile(`../examples/${filePath}`);
} else {
    fetchFile("./default_code.txt");
}

