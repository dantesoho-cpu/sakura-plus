import Phaser from 'phaser';
import { audio } from '../audio/Audio';
export class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  create(d: any) { const K = d?.lvl || 'Level1';
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '14px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 };
    this.add.rectangle(240, 135, 480, 270, 0x0a0618, 0.62);
    const card = this.add.graphics();
    card.fillStyle(0x1a0f2e, 0.94).fillRoundedRect(100, 48, 280, 188, 8);
    card.lineStyle(2, 0xff7ac8, 0.7).strokeRoundedRect(100, 48, 280, 188, 8);
    card.lineStyle(1, 0xffd23f, 0.25).strokeRoundedRect(104, 52, 272, 180, 6);
    this.add.text(240, 68, 'PAUSED', st).setOrigin(0.5);
    const lvl = () => this.scene.get(K) as any;
    const resume = () => { audio.sfx('menu', { rate: 1.2, vol: 0.45 }); this.scene.resume(K); this.scene.stop(); };
    const cp = () => { resume(); lvl().checkpoint(); };
    const restart = () => { audio.sfx('menu'); this.scene.stop(K); this.scene.start(K); };
    const title = () => { audio.sfx('menu'); this.scene.stop(K); this.scene.start('Title'); };
    const items: [string, () => void][] = [['RESUME  (P / ESC)', resume], ['RESPAWN AT CHECKPOINT  (R)', cp], ['RESTART LEVEL  (Q)', restart], ['TITLE  (T)', title]];
    items.forEach(([t, f], i) => { const tx = this.add.text(240, 96 + i * 18, t, { ...st, fontSize: '10px', color: i === 0 ? '#ffd23f' : '#fff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      tx.on('pointerover', () => { tx.setColor('#ffd23f'); audio.sfx('menu', { rate: 1.5, vol: 0.25 }); }); tx.on('pointerout', () => tx.setColor(i === 0 ? '#ffd23f' : '#fff')); tx.on('pointerdown', f); });
    const pct = (v: number) => `${Math.round(v * 100)}%`; const S = audio.set;
    const lab = () => [`MUSIC  ◀ ${pct(S.music)} ▶   ( [ / ] )`, `SFX  ◀ ${pct(S.sfx)} ▶   ( - / = )`, `MUTE: ${S.mute ? 'ON' : 'OFF'}   (M)`];
    const rows = lab().map((t, i) => this.add.text(240, 178 + i * 14, t, { ...st, fontSize: '9px', color: '#bfe8ff' }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    const upd = () => { const l = lab(); rows.forEach((r, i) => r.setText(l[i])); audio.apply(); audio.sfx('menu'); };
    const step = (k: 'music' | 'sfx', d: number) => { S[k] = Math.round(Math.max(0, Math.min(1, S[k] + d)) * 10) / 10; upd(); };
    rows[0].on('pointerdown', (p: any) => step('music', p.x < 240 ? -0.1 : 0.1)); rows[1].on('pointerdown', (p: any) => step('sfx', p.x < 240 ? -0.1 : 0.1));
    rows[2].on('pointerdown', () => { S.mute = !S.mute; upd(); });
    const kb = this.input.keyboard!;
    kb.on('keydown-OPEN_BRACKET', () => step('music', -0.1)); kb.on('keydown-CLOSED_BRACKET', () => step('music', 0.1));
    kb.on('keydown-MINUS', () => step('sfx', -0.1)); kb.on('keydown-PLUS', () => step('sfx', 0.1)); kb.on('keydown-M', () => { S.mute = !S.mute; upd(); });
    kb.on('keydown-P', resume); kb.on('keydown-ESC', resume); kb.on('keydown-R', cp); kb.on('keydown-BACKSPACE', cp); kb.on('keydown-Q', restart); kb.on('keydown-T', title);
    audio.sfx('menu', { rate: 0.85, vol: 0.4 });
  }
}
