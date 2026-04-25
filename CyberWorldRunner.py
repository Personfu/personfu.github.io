"""
CyberWorldRunner.py
A CyberWorld-themed arcade game demonstrating five major Python competencies:
- Control Structures
- Error Handling
- Classes & Methods
- Recursion
- Array Processing

Original, well-commented code for educational use.
"""
import random
import sys
import time

# --- Classes & Methods ---
class Player:
    def __init__(self, name):
        self.name = name
        self.score = 0
        self.lives = 3
        self.position = 0

    def move(self, steps):
        self.position += steps
        print(f"{self.name} moves to node {self.position}.")

    def add_score(self, points):
        self.score += points
        print(f"Score increased by {points}. Total: {self.score}")

    def lose_life(self):
        self.lives -= 1
        print(f"{self.name} lost a life! Lives left: {self.lives}")

# --- Recursion Example: Maze Path Generation ---
def generate_path(node, end, path, visited):
    path.append(node)
    visited.add(node)
    if node == end:
        return path
    neighbors = [n for n in range(node+1, node+4) if n <= end]
    random.shuffle(neighbors)
    for n in neighbors:
        if n not in visited:
            result = generate_path(n, end, path.copy(), visited.copy())
            if result:
                return result
    return None

# --- Array Processing Example ---
def random_event():
    events = [
        ("Credential Cache Found", +20),
        ("Packet Loss Window", +10),
        ("Data Corruption", -15),
        ("Firewall Spike", -10)
    ]
    event = random.choice(events)
    print(f"Random Event: {event[0]} (Effect: {event[1]})")
    return event[1]

# --- Error Handling Example ---
def get_int_input(prompt, min_val, max_val):
    while True:
        try:
            val = int(input(prompt))
            if min_val <= val <= max_val:
                return val
            else:
                print(f"Enter a number between {min_val} and {max_val}.")
        except ValueError:
            print("Invalid input. Please enter a number.")

# --- Main Game Loop (Control Structures) ---
def main():
    print("\n=== CYBERWORLD RUNNER ===\n")
    name = input("Enter your operative name: ")
    player = Player(name)
    end_node = 10
    print(f"Welcome, {name}! Escort your data convoy to node {end_node}.")
    path = generate_path(0, end_node, [], set())
    print(f"Generated path: {path}")
    node = 0
    while node < end_node and player.lives > 0:
        print(f"\nNode {node+1}: Choose your action:")
        print("1. Advance (risk event)")
        print("2. Rest (skip event, lose time)")
        choice = get_int_input("> ", 1, 2)
        if choice == 1:
            effect = random_event()
            if effect < 0:
                player.lose_life()
            else:
                player.add_score(effect)
            player.move(1)
            node += 1
        else:
            print("You rest and recover. No progress this turn.")
        time.sleep(0.5)
    if player.lives > 0:
        print(f"\nMission Complete! Final Score: {player.score}")
    else:
        print("\nGame Over. Better luck next time!")

if __name__ == "__main__":
    main()
