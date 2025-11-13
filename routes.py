from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse
import asyncio
import json
from typing import Any, Dict
from pathlib import Path
from game import global_game
from web_socket import process_event_sync, process_event, register_ws, unregister_ws, broadcast_state, broadcast

app = FastAPI()

dist_index = Path(__file__).resolve().parent / 'dist' / 'index.html'
dist_dir = dist_index.parent


@app.get('/', include_in_schema=False)
def root():
    if dist_index.exists():
        return FileResponse(str(dist_index), media_type='text/html')
    return JSONResponse(content={"message": "frontend not built"}, status_code=404)


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


@app.post("/gesture")
def gesture(payload: Dict[str, Any]):
    if not isinstance(payload, dict):
        return JSONResponse(content={"error": "invalid payload"}, status_code=400)
    g = str(payload.get("gesture", "")).lower().strip()
    mapping = {
        "thumbs_up": {"command": "gesture", "type": "toggle_right"},
        "thumbs down": {"command": "gesture", "type": "toggle_left"},
        "thumbs_down": {"command": "gesture", "type": "toggle_left"},
        "pointing_up": {"command": "gesture", "type": "jump_once"},
        "pointing up": {"command": "gesture", "type": "jump_once"},
        "victory": {"command": "gesture", "type": "stop"},
        "closed_fist": {"command": "gesture", "type": "stop"},
        "closed fist": {"command": "gesture", "type": "stop"},
        "open_fist": {"command": "gesture", "type": "stop"},
        "open fist": {"command": "gesture", "type": "stop"},
    }
    msg = mapping.get(g)
    if not msg:
        return JSONResponse(content={"error": "unknown gesture"}, status_code=400)
    asyncio.run(broadcast(msg))
    return JSONResponse(content={"ok": True, "sent": msg})


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
            # broadcast updated state to other clients
            await broadcast_state(exclude=websocket)
            # if this event contained a roll_value in the outcome, emit an explicit roll_result command
            try:
                outcome = resp.get("outcome") or {}
                if isinstance(outcome, dict) and outcome.get("roll_value") is not None:
                    await broadcast({"command": "roll_result", "player": event.get("player"), "value": outcome.get("roll_value"), "outcome": outcome})
            except Exception:
                pass
    finally:
        await unregister_ws(websocket)


@app.post("/reset")
def reset() -> Dict[str, Any]:
    global_game.reset()
    return JSONResponse(content={"status": "reset", "state": global_game.get_state()})


@app.get("/{full_path:path}", include_in_schema=False)
def spa_catchall(full_path: str):
    requested = dist_dir / full_path
    if requested.exists() and requested.is_file():
        return FileResponse(str(requested))
    if dist_index.exists():
        return FileResponse(str(dist_index), media_type='text/html')
    return JSONResponse(content={"message": "frontend not built"}, status_code=404)
