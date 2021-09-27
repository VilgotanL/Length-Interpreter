import math
import sys
import os

lines = []
try:
	fileName = sys.argv[1]
	file = open(fileName)
	lines = file.read().split("\n")
	file.close()
except Exception as e:
	print(f"Error while opening file:\n{e}", end="", flush=True)
	sys.exit(0)

program = []
for i in range(0, len(lines)):
	program.append(len(lines[i]))

def err(str):
	print("\n"+str)
	sys.exit(0)

stack = []
pc = 0

def pop(index = -1):
	if len(stack) < 1:
		err("Error: stack underflow")
	return stack.pop(index)

while pc >= 0 and pc < len(program):
	if program[pc] == 9: #inp
		stack.append(ord(sys.stdin.read(1)))
	elif program[pc] == 10: #add
		stack.append(pop() + pop())
	elif program[pc] == 11: #sub
		a, b = pop(), pop()
		stack.append(b - a)
	elif program[pc] == 12: #dup
		a = pop()
		stack.append(a)
		stack.append(a)
	elif program[pc] == 13: #cond
		a = pop()
		if a == 0:
			pc += 1 #skip
			if pc < len(program) and (program[pc] == 14 or program[pc] == 25): #if skipped instruction is gotou or push
				pc += 1 #skip instruction argument
	elif program[pc] == 14: #gotou
		if pc+1 >= len(program): err("Error: Expected instruction argument after push")
		pc = program[pc+1] - 1
	elif program[pc] == 15: #outn
		print(pop(), end="", flush=True)
	elif program[pc] == 16: #outa
		print(chr(pop()), end="", flush=True)
	elif program[pc] == 17: #rol
		stack.insert(pop(), 0)
	elif program[pc] == 18: #swap
		a, b = pop(), pop()
		stack.append(a)
		stack.append(b)
	elif program[pc] == 20: #mul
		a, b = pop(), pop()
		stack.append(a * b)
	elif program[pc] == 21: #div
		a, b = pop(), pop()
		stack.append(b / a)
	elif program[pc] == 23: #pop
		pop()
	elif program[pc] == 24: #gotos
		pc = pop()
	elif program[pc] == 25: #push
		if pc+1 >= len(program): err("Error: Expected instruction argument after push")
		stack.append(program[pc+1])
		pc += 1 #skip instruction argument
	elif program[pc] == 27: #ror
		stack.append(pop(0))
	
	pc += 1
