#define _CRT_SECURE_NO_WARNINGS

#include <iostream>
#include <fstream>
#include <string>
#include <vector>


void err(const char* str)
{
	throw str;
}

void run(int nLines, int* program)
{
	std::vector<double> stack;
	int pc = 0;

	while (pc >= 0 && pc < nLines) {
		switch (program[pc]) {
			case 9: { //inp
				char inp;
				std::cin >> inp;
				stack.push_back(inp);
				break;
			}
			case 10: { //add
				if (stack.size() < 2) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				double b = stack.back();
				stack.pop_back();
				stack.push_back(a + b);
				break;
			}
			case 11: { //sub
				if (stack.size() < 2) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				double b = stack.back();
				stack.pop_back();
				stack.push_back(b - a);
				break;
			}
			case 12: { //dup
				if (stack.size() < 1) err("\nError: stack underflow");
				stack.push_back(stack.back());
				break;
			}
			case 13: { //cond
				if (stack.size() < 1) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				if (a == 0) {
					pc++; //skip
					if (pc < nLines && (program[pc] == 14 || program[pc] == 25)) { //if gotou or push
						pc++; //skip the instruction argument too
					}
				}
				break;
			}
			case 14: { //gotou
				if (pc + 1 >= nLines) err("\nError: expected instruction argument after gotou");
				double a = program[pc+1];
				pc = a - 1;
				break;
			}
			case 15: { //outn
				if (stack.size() < 1) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				std::cout << a;
				break;
			}
			case 16: { //outa
				if (stack.size() < 1) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				std::cout << (char) a;
				break;
			}
			case 17: { //rol
				if (stack.size() < 1) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				stack.insert(stack.begin(), a); //push to bottom of stack
				break;
			}
			case 18: { //swap
				if (stack.size() < 2) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				double b = stack.back();
				stack.pop_back();
				stack.push_back(a);
				stack.push_back(b);
				break;
			}
			case 20: { //mul
				if (stack.size() < 2) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				double b = stack.back();
				stack.pop_back();
				stack.push_back(a * b);
				break;
			}
			case 21: { //div
				if (stack.size() < 2) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				double b = stack.back();
				stack.pop_back();
				stack.push_back(b / a);
				break;
			}
			case 23: { //pop
				if (stack.size() < 1) err("\nError: stack underflow");
				stack.pop_back();
				break;
			}
			case 24: { //gotos
				if (stack.size() < 1) err("\nError: stack underflow");
				double a = stack.back();
				stack.pop_back();
				pc = (int)a;
				break;
			}
			case 25: { //push
				if (pc + 1 >= nLines) err("\nError: expected instruction argument after push");
				stack.push_back(program[pc+1]);
				pc++;
				break;
			}
			case 27: { //rol
				if (stack.size() < 1) err("\nError: stack underflow");
				double a = stack.front();
				stack.erase(stack.begin());
				stack.push_back(a); //push to bottom of stack
				break;
			}
		}
		pc++;
	}
	
}

int main(int argc, char** argv)
{
	if (argc < 2) {
		std::cout << "Please specify a file to run as a Length program!" << std::endl;
		return 0;
	}
	char* filePath = argv[1];
	std::ifstream file;
	file.open(filePath);
	std::string currLine;

	if (!file) {
		std::cout << "Error while opening file: " << strerror(errno) << std::endl;
		return 0;
	}

	//get number of lines
	std::string unused;
	int nLines = 0;
	while (std::getline(file, currLine)) {
		nLines++;
		if (file.eof()) break;
	}
	if (file.eof() && file.fail()) {
		nLines++;
	}
	
	file.clear(); //clear eof bit and seek to beginning so we can use getline again
	file.seekg(std::ifstream::beg);

	int *program = new int[nLines];

	int i = 0;
	while (i < nLines) {
		std::getline(file, currLine);
		if (i >= nLines) throw "Internal interpreter file length error";
		program[i] = currLine.length();
		//std::cout << currLine << std::endl;
		i++;
	}

	try {
		run(nLines, program);
	} catch (const char* e) {
		std::cout << e << std::endl;
	}

	file.close();
	delete[] program;
	
	return 0;
}