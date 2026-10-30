import Phaser from 'phaser';
import { audio } from '../audio/Audio';
export class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  create(d: any) { const K = d?.lvl || 'Level1';
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '14px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 };
    this.add.rectangle(240, 135, 480, 270, 0x140a24, 0.55);
    this.add.text(240, 96, 'PAUSED', st).setOrigin(0.5);
    const lvl = () => this.scene.get(K) as any;
    const resume = () => { this.scene.resume(K); this.scene.stop(); };
    const cp = () => { resume(); lvl().checkpoint(); };
    const restart = () => { this.scene.stop(K); this.scene.start(K); };
    const title = () => { this.scene.stop(K); this.scene.start('Title'); };
    const items: [string, () => void][] = [['RESUME  (P / ESC)', resume], ['RESPAWN AT CHECKPOINT  (R)', cp], ['RESTART LEVEL  (Q)', restart], ['TITLE  (T)', title]];
    items.forEach(([t, f], i) => { const tx = this.add.text(240, 124 + i * 18, t, { ...st, fontSize: '10px', color: i === 1 ? '#ffd6f0' : '#fff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      tx.on('pointerover', () => tx.setColor('#ffd23f')); tx.on('pointerout', () => tx.setColor(i === 1 ? '#ffd6f0' : '#fff')); tx.on('pointerdown', f); });
    // sound settings (persisted to localStorage): click to step, or [ ] music, - = sfx, M mute
    const pct = (v: number) => `${Math.round(v * 100)}%`; const S = audio.set;
    const lab = () => [`MUSIC  ◀ ${pct(S.music)} ▶   ( [ / ] )`, `SFX  ◀ ${pct(S.sfx)} ▶   ( - / = )`, `MUTE: ${S.mute ? 'ON' : 'OFF'}   (M)`];
    const rows = lab().map((t, i) => this.add.text(240, 204 + i * 15, t, { ...st, fontSize: '9px', color: '#bfe8ff' }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    const upd = () => { const l = lab(); rows.forEach((r, i) => r.setText(l[i])); audio.apply(); audio.sfx('menu'); };
    const step = (k: 'music' | 'sfx', d: number) => { S[k] = Math.round(Math.max(0, Math.min(1, S[k] + d)) * 10) / 10; upd(); };
    rows[0].on('pointerdown', (p: any) => step('music', p.x < 240 ? -0.1 : 0.1)); rows[1].on('pointerdown', (p: any) => step('sfx', p.x < 240 ? -0.1 : 0.1));
    rows[2].on('pointerdown', () => { S.mute = !S.mute; upd(); });
    const kb = this.input.keyboard!;
    kb.on('keydown-OPEN_BRACKET', () => step('music', -0.1)); kb.on('keydown-CLOSED_BRACKET', () => step('music', 0.1));
    kb.on('keydown-MINUS', () => step('sfx', -0.1)); kb.on('keydown-PLUS', () => step('sfx', 0.1)); kb.on('keydown-M', () => { S.mute = !S.mute; upd(); });
    kb.on('keydown-P', resume); kb.on('keydown-ESC', resume); kb.on('keydown-R', cp); kb.on('keydown-BACKSPACE', cp); kb.on('keydown-Q', restart); kb.on('keydown-T', title);
  }
}
