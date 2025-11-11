import random
from typing import Dict, Any


class PlayerA:
    def __init__(self, name: str = "Trapped"):
        self.name = name
        self.health = 100
        self.energy = 50
        self.trust = 50

    def to_dict(self):
        return {"name": self.name, "health": self.health, "energy": self.energy, "trust": self.trust}


class PlayerB:
    def __init__(self, name: str = "Operator"):
        self.name = name
        self.health = 100
        self.energy = 60
        self.trust = 50

    def to_dict(self):
        return {"name": self.name, "health": self.health, "energy": self.energy, "trust": self.trust}


class Bot:
    def __init__(self, seed: int = 0):
        self.corruption = 0
        self.interference = 0
        self.rng = random.Random(seed)

    def escalate(self, amount: int = 1):
        self.corruption = min(100, self.corruption + amount)
        self.interference = min(100, int(self.corruption * 0.8))

    def to_dict(self):
        return {"corruption": self.corruption, "interference": self.interference}


class GameWorld:
    def __init__(self, seed: int = 0):
        self.rng = random.Random(seed)
        self.playerA = PlayerA()
        self.playerB = PlayerB()
        self.ai = Bot(seed)
        self.level = 0
        self.log = []
        self.turn = 0
        self.running = False

    async def start(self):
        self.level_one()
        self.running = True
        self.log.append("Campaign started.")

    def rigger(self, sides: int = 20, bias: float = 0.0) -> int:
        base = self.rng.random()
        modified = max(0.0, min(1.0, base + bias))
        return int(modified * (sides - 1)) + 1

    def checker(self, difficulty: int, bias: float = 0.0) -> bool:
        interference_factor = (100 - self.ai.interference) / 100.0
        coordination = (self.playerA.trust + self.playerB.trust) / 200.0
        final_bias = bias + (coordination * 0.1) - ((1 - interference_factor) * 0.1)
        roll = self.rigger(20, final_bias)
        success = roll >= difficulty
        self.log.append(f"Roll: {roll} vs {difficulty} (bias {final_bias:.2f}) -> {'success' if success else 'fail'}")
        return success

    async def perform_action(self, player: str, action) -> Dict[str, Any]:
        p = self.playerA if player.upper() == "A" else self.playerB
        outcome = {"player": player, "action": action}
        act = action
        if isinstance(action, dict):
            act = action.get("type")
        if act == "move":
            ok = self.checker(10, bias=0.05)
            if ok:
                p.energy = max(0, p.energy - 5)
                outcome["result"] = "moved"
            else:
                p.health = max(0, p.health - 10)
                outcome["result"] = "hurt"
        elif action == "interact":
            ok = self.checker(12, bias=0.1)
            if ok:
                p.trust = min(100, p.trust + 5)
                outcome["result"] = "success"
            else:
                p.trust = max(0, p.trust - 5)
                outcome["result"] = "fail"
        elif action == "freeze":
            ok = self.checker(14, bias=-0.05)
            if ok:
                self.ai.interference = max(0, self.ai.interference - 10)
                outcome["result"] = "frozen"
            else:
                self.ai.escalate(2)
                outcome["result"] = "resist"
        elif action == "assist":
            ok = self.checker(11, bias=0.08)
            if ok:
                self.playerA.trust = min(100, self.playerA.trust + 3)
                self.playerB.trust = min(100, self.playerB.trust + 3)
                outcome["result"] = "assisted"
            else:
                outcome["result"] = "no_effect"
        elif isinstance(action, dict) and action.get("type") == "roll":
            value = int(action.get("value", 1))
            bias = (value - ((20 + 1) / 2)) / 40.0
            ok = self.checker(11, bias=bias)
            if ok:
                p.trust = min(100, p.trust + 4)
                outcome["result"] = "roll_success"
            else:
                p.trust = max(0, p.trust - 3)
                self.ai.escalate(1)
                outcome["result"] = "roll_fail"
        else:
            outcome["result"] = "unknown"
        self.turn += 1
        return outcome

    async def resolve_turn(self) -> Dict[str, Any]:
        summary = {"turn": self.turn}
        if self.turn % 3 == 0:
            self.ai.escalate(1)
            self.playerA.energy = max(0, self.playerA.energy - 2)
            self.playerB.energy = max(0, self.playerB.energy - 1)
        summary.update(self.get_state())
        return summary

    def get_state(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "turn": self.turn,
            "playerA": self.playerA.to_dict(),
            "playerB": self.playerB.to_dict(),
            "ai": self.ai.to_dict(),
            "log": list(self.log[-40:])
        }

    def reset(self, seed: int = 0):
        self.__init__(seed)

    def level_one(self):
        self.level = 1
        self.log.append("Level One")
        self.ai.corruption = 5
        self.ai.interference = 2

    def level_two(self):
        self.level = 2
        self.log.append("Level Two")
        self.ai.escalate(10)

    def level_three(self):
        self.level = 3
        self.log.append("Level Three")
        self.ai.escalate(20)

    def final_core(self):
        self.level = 4
        self.log.append("Final Core")
        self.ai.escalate(40)


global_game = GameWorld(seed=0)
