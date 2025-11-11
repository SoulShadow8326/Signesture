from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import asyncio, json
from typing import Any, Dict
from game import global_game
from socket import process_event_sync, process_event, register_ws, unregister_ws, broadcast_state

app = FastAPI()


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@app.get("/state")
def state() -> Dict[str, Any]:
    return global_game.get_state()


@app.post("/start")
def start() -> Dict[str, Any]:
    _run_async(global_game.start())
    return JSONResponse(content={"status": "started", "state": global_game.get_state()})


@app.post("/action")
def action(payload: Dict[str, Any]):
    if not isinstance(payload, dict):
        return JSONResponse(content={"error": "invalid payload"}, status_code=400)
    resp = process_event_sync(payload)
    return JSONResponse(content=resp)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await register_ws(websocket)
    try:
        while True:
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                break
            try:
                event = json.loads(data)
            except Exception:
                await websocket.send_text(json.dumps({"error": "invalid json"}))
                continue
            resp = await process_event(event)
            await websocket.send_text(json.dumps(resp))
            await broadcast_state(exclude=websocket)
    finally:
        await unregister_ws(websocket)


@app.post("/reset")
def reset() -> Dict[str, Any]:
    global_game.reset()
    return JSONResponse(content={"status": "reset", "state": global_game.get_state()})
