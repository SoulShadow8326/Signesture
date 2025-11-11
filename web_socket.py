import asyncio
import json
from typing import Set
from game import global_game

clients: Set[object] = set()


async def process_event(event: dict) -> dict:
    player = event.get("player")
    action = event.get("action")
    if not player or not action:
        return {"error": "missing player or action"}
    outcome = await global_game.perform_action(player, action)
    state = global_game.get_state()
    return {"outcome": outcome, "state": state}


async def register_ws(ws):
    clients.add(ws)


async def unregister_ws(ws):
    try:
        clients.remove(ws)
    except Exception:
        pass


async def broadcast_state(exclude=None):
    payload = json.dumps({"broadcast": global_game.get_state()})
    for c in set(clients):
        if c is exclude:
            continue
        try:
            await c.send_text(payload)
        except Exception:
            try:
                clients.remove(c)
            except Exception:
                pass


def process_event_sync(event: dict) -> dict:
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(process_event(event))
    finally:
        loop.close()


__all__ = ["process_event", "process_event_sync", "register_ws", "unregister_ws", "broadcast_state", "clients"]
