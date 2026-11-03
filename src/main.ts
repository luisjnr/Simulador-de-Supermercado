import Phaser from 'phaser';
import { MarketManager } from './systems/economy/MarketManager';
import { MarketScene } from './game/scenes/MarketScene';
import { MarketUI } from './ui/MarketUI';
import './style.css';

const market = new MarketManager();
const marketScene = new MarketScene(market);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 640,
  height: 640,
  backgroundColor: '#e9dfca',
  scene: [marketScene],
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 640,
  },
};

const game = new Phaser.Game(config);
new MarketUI(market, game, marketScene);

window.addEventListener('beforeunload', () => game.destroy(true));
