// Room codes over WebRTC. PeerJS's public server only introduces the browsers; the host's browser
// then acts as the room: guests talk to the host, and the host talks to everyone.
(function (root) {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I/L, which are easy to misread
  const CODE_LENGTH = 5;
  const JOIN_TIMEOUT_MS = 15000;
  const MAX_PLAYERS = 4;

  function newCode() {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return code;
  }
  const normalizeCode = (text) => String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const peerId = (gameId, code) => `nihongo-games-${gameId}-${code}`.toLowerCase();

  class GameRoom {
    constructor(gameId, name) {
      this.gameId = gameId;
      this.players = [{ name, conn: null, gone: false }];
      this.isHost = true;
      this.me = 0;
      this.code = '';
      this.started = false;
      this.closed = false;
      this.onMessage = () => {};
      this.onPlayers = () => {};
      this.onClosed = () => {};
      this.onPlayerLeft = () => {};
    }

    names() { return this.players.map((p) => p.name); }

    // ---------- Host ----------

    static host(gameId, name) {
      const room = new GameRoom(gameId, name);
      return new Promise((resolve, reject) => {
        const open = (attempt) => {
          room.code = newCode();
          const peer = new root.Peer(peerId(gameId, room.code));
          room.peer = peer;
          peer.on('open', () => resolve(room));
          peer.on('connection', (conn) => room.acceptGuest(conn));
          peer.on('disconnected', () => { if (!room.closed && !peer.destroyed) peer.reconnect(); });
          peer.on('error', (err) => {
            if (err.type === 'unavailable-id' && attempt < 5) { peer.destroy(); open(attempt + 1); return; }
            if (!peer.open && err.type !== 'peer-unavailable') reject(new Error('network'));
          });
        };
        open(0);
      });
    }

    acceptGuest(conn) {
      conn.on('data', (msg) => {
        if (msg.t === '_hello') {
          const active = this.players.filter((p) => !p.gone).length;
          if (this.started || active >= MAX_PLAYERS) {
            conn.send({ t: '_rejected', reason: this.started ? 'started' : 'full' });
            setTimeout(() => conn.close(), 300);
            return;
          }
          this.players.push({ name: this.uniqueName(msg.name), conn, gone: false });
          this.publishLobby();
          return;
        }
        const from = this.players.findIndex((p) => p.conn === conn);
        if (from >= 0) this.onMessage(msg, from);
      });
      conn.on('close', () => this.dropGuest(conn));
      conn.on('error', () => this.dropGuest(conn));
    }

    uniqueName(wanted) {
      const name = String(wanted).slice(0, 10);
      const number = this.players.length + 1;
      if (!name || /^P\d$/.test(name)) return `P${number}`;
      return this.names().includes(name) ? `${name} ${number}` : name;
    }

    dropGuest(conn) {
      const i = this.players.findIndex((p) => p.conn === conn);
      if (i < 0 || this.players[i].gone) return;
      if (this.started) {
        // Mid-stage the slots stay put, because scores and messages refer to them by number.
        this.players[i].gone = true;
        this.onPlayerLeft(i);
        this.broadcast({ t: '_left', index: i });
      } else {
        this.players.splice(i, 1);
        this.publishLobby();
      }
    }

    publishLobby() {
      this.players.forEach((p, i) => {
        if (p.conn && p.conn.open) p.conn.send({ t: '_lobby', names: this.names(), you: i, code: this.code });
      });
      this.onPlayers(this.names());
    }

    // Everyone who left during the last stage is gone for good once it ends.
    setStarted(started) {
      this.started = started;
      if (!started && this.players.some((p) => p.gone)) {
        this.players = this.players.filter((p) => !p.gone);
        this.publishLobby();
      }
    }

    broadcast(msg) {
      for (const p of this.players) if (p.conn && p.conn.open) p.conn.send(msg);
    }

    // ---------- Guest ----------

    static join(gameId, code, name) {
      const room = new GameRoom(gameId, name);
      room.isHost = false;
      room.code = normalizeCode(code);
      return new Promise((resolve, reject) => {
        let joined = false;
        const fail = (reason) => {
          if (joined) return;
          clearTimeout(timer);
          room.leave();
          reject(new Error(reason));
        };
        const timer = setTimeout(() => fail('timeout'), JOIN_TIMEOUT_MS);
        const peer = new root.Peer();
        room.peer = peer;
        peer.on('error', (err) => {
          if (joined) return;
          fail(err.type === 'peer-unavailable' ? 'not-found' : 'network');
        });
        peer.on('open', () => {
          const conn = peer.connect(peerId(gameId, room.code), { reliable: true, serialization: 'json' });
          room.host = conn;
          conn.on('open', () => conn.send({ t: '_hello', name }));
          conn.on('data', (msg) => {
            if (msg.t === '_rejected') return fail(msg.reason);
            if (msg.t === '_lobby') {
              room.players = msg.names.map((n) => ({ name: n, conn: null, gone: false }));
              room.me = msg.you;
              if (!joined) { joined = true; clearTimeout(timer); resolve(room); }
              room.onPlayers(room.names());
              return;
            }
            if (msg.t === '_left') {
              if (room.players[msg.index]) room.players[msg.index].gone = true;
              room.onPlayerLeft(msg.index);
              return;
            }
            room.onMessage(msg, 0);
          });
          conn.on('close', () => {
            if (joined && !room.closed) { room.closed = true; room.onClosed(); }
          });
        });
      });
    }

    send(msg) {
      if (this.host && this.host.open) this.host.send(msg);
    }

    leave() {
      this.closed = true;
      if (this.peer && !this.peer.destroyed) this.peer.destroy();
    }
  }

  const api = { GameRoom, newCode, normalizeCode, CODE_LENGTH, MAX_PLAYERS };
  root.Rooms = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
