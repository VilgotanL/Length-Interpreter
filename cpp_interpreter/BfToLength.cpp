#define _CRT_SECURE_NO_WARNINGS

#include <iostream>
#include <fstream>
#include <string>
#include <vector>




class BfToLengthTranspiler {
public:
	enum instrs { i_inp = 9, i_add = 10, i_sub = 11, i_dup = 12, i_cond = 13, i_gotou = 14, i_outn = 15, i_outa = 16, i_rol = 17, i_swap = 18, i_mul = 20, i_div = 21, i_pop = 23, i_gotos = 24, i_push = 25, i_ror = 27 };

	int currId = -1;
	
	int getId() {
		return currId--;
	}

	std::vector<int> lineLengths;
	std::vector<int> loopIdsStack;

	void err(const char* str)
	{
		throw str;
	}

	void push(int num) {
		lineLengths.push_back(num);
	}

	int defineLabel(int id) {
		int lineNum = lineLengths.size();
		for (int i = 0; i < lineNum; i++) {
			if (lineLengths[i] == id) {
				lineLengths[i] = lineNum;
			}
		}
		return lineNum;
	}

	void ifEqGotou(int id) {
		push(i_sub); push(i_cond); push(i_gotou);
		push(lineLengths.size() + 3);
		push(i_gotou); push(id);
	}

	std::string transpile(std::string program)
	{
		lineLengths.clear();
		loopIdsStack.clear();

		//initial code
		push(i_push); push(420);
		push(i_push); push(0);
		

		for (int i = 0; i < program.size(); i++) {
			if (program[i] == '+') {
				int afterId = getId();
				int overflowedId = getId();
				push(i_push); push(1); push(i_add); push(i_dup); push(i_push); push(256);
				//check equals
				ifEqGotou(overflowedId);

				push(i_gotou); push(afterId);
				overflowedId = defineLabel(overflowedId);
				push(i_pop); push(i_push); push(0);
				afterId = defineLabel(afterId);
			} else if (program[i] == '-') {
				int afterId = getId();
				int overflowedId = getId();
				push(i_push); push(1); push(i_sub); push(i_dup); push(i_push); push(0); push(i_push); push(1); push(i_sub);
				//check equals
				ifEqGotou(overflowedId);

				push(i_gotou); push(afterId);
				overflowedId = defineLabel(overflowedId);
				push(i_pop); push(i_push); push(255);
				afterId = defineLabel(afterId);
			} else if(program[i] == '>') {
				int equalsId = getId();
				int afterId = getId();
				push(i_ror); push(i_dup); push(i_push); push(420);
				ifEqGotou(equalsId);
				push(i_gotou); push(afterId);
				equalsId = defineLabel(equalsId);
				push(i_rol); push(i_push); push(0);
				afterId = defineLabel(afterId);
			} else if(program[i] == '<') {
				push(i_rol);
			} else if(program[i] == '.') {
				push(i_dup); push(i_outa);
			} else if(program[i] == '.') {
				push(i_pop); push(i_inp);
			} else if(program[i] == '[') {
				int isZeroId = getId();
				int afterId = getId(); //for [
				int afterId2 = getId(); //for ]
				push(i_dup); push(i_push); push(0);
				ifEqGotou(isZeroId);
				push(i_gotou); push(afterId);
				isZeroId = defineLabel(isZeroId);
				push(i_gotou); push(afterId2);
				afterId = defineLabel(afterId);

				loopIdsStack.push_back(afterId);
				loopIdsStack.push_back(afterId2);
			} else if(program[i] == ']') {
				if (loopIdsStack.size() < 2) err("Error while transpiling: Not enough [");
				int afterId2 = loopIdsStack.back();
				loopIdsStack.pop_back();
				int afterId = loopIdsStack.back();
				loopIdsStack.pop_back();

				push(i_dup); push(i_push); push(0);
				ifEqGotou(afterId2);
				push(i_gotou); push(afterId);
				afterId2 = defineLabel(afterId2);
			}
		}

		if(loopIdsStack.size() != 0) err("Error while transpiling: Not enough ]");

		std::string generated = "";
		for (int i = 0; i < lineLengths.size(); i++) {
			int digit = 1;
			for (int j = 0; j < lineLengths[i]; j++) {
				generated += std::to_string(digit);
				digit++;
				digit = digit % 10;
			}
			generated += '\n';
		}

		return generated;
	}
};

int main(int argc, char** argv)
{
	if (argc < 2) {
		std::cout << "Please specify a file to run as a Length program!" << std::endl;
		return 0;
	}
	char* filePath = argv[1];
	std::ifstream file;
	file.open(filePath);
	std::string program;

	if (!file) {
		std::cout << "Error while opening file: " << strerror(errno) << std::endl;
		return 0;
	}
	
	//reads whole ifstream into std::string program, thx stackoverflow
	file.seekg(0, std::ios::end);
	program.reserve(file.tellg());
	file.seekg(0, std::ios::beg);
	program.assign((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());

	BfToLengthTranspiler transpiler;

	std::string output;

	try {
		output = transpiler.transpile(program);
	}
	catch (const char* e) {
		std::cout << e << std::endl;
		file.close();
		return 0;
	}
	
	file.close();

	//write to file
	std::ofstream outFile;
	outFile.open("out.txt");
	outFile << output;
	outFile.close();

	std::cout << "Successfully transpiled brainfuck to Length!" << std::endl;

	return 0;
}