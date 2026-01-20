import Phaser from "phaser";
import { BaseLevelScene } from "./BaseLevelScene";
import { ArcadeBot } from "../entities/ArcadeBot";
import { BugEnemy } from "../entities/BugEnemy";
import { FlyingBat } from "../entities/FlyingBat";
import { SlimeCrawler } from "../entities/SlimeCrawler";
import * as utils from "../utils";

export class Level2Scene extends BaseLevelScene {
  constructor() {
    super({ key: "Level2Scene" });
  }

  create(): void {
    this.createBaseElements();
    
    // Create pickups
    this.createPickups();

    // Play background music
    this.backgroundMusic = this.sound.add("cave_exploration_theme", {
      volume: 0.6,
      loop: true
    });
    this.backgroundMusic.play();
  }

  update(time: number, delta: number): void {
    this.baseUpdate(time, delta);
  }

  // Map size: 35 tiles x 14 tiles = 2240x896 pixels
  setupMapSize(): void {
    this.mapWidth = 35 * 64;  // 2240
    this.mapHeight = 14 * 64; // 896
  }

  createBackground(): void {
    // Calculate scale to fit map height
    const bgHeight = 1024;
    const scale = this.mapHeight / bgHeight;
    const bgWidth = 1536 * scale;
    
    // Create multiple backgrounds to cover map width with parallax
    const numBackgrounds = Math.ceil(this.mapWidth / bgWidth) + 1;
    for (let i = 0; i < numBackgrounds; i++) {
      const bg = this.add.image(i * bgWidth, 0, "hollow_cave_background");
      bg.setOrigin(0, 0);
      utils.initScale(bg, { x: 0, y: 0 }, undefined, this.mapHeight);
      bg.setScrollFactor(0.2);
      bg.setDepth(-100);
    }
  }

  createTileMap(): void {
    this.map = this.make.tilemap({ key: "cave_level_2" });
    this.groundTileset = this.map.addTilesetImage("cave_ground_tileset", "cave_ground_tileset")!;
    this.groundLayer = this.map.createLayer("ground", this.groundTileset, 0, 0)!;
    this.groundLayer.setCollisionByExclusion([-1]);
  }

  createPlayer(): void {
    // Spawn player on main ground floor, left side
    // Main ground floor top is at y=12*64=768
    const spawnX = 100;
    const spawnY = 12 * 64;
    this.player = new ArcadeBot(this, spawnX, spawnY);
  }

  createEnemies(): void {
    const tileSize = 64;
    
    // Reduced enemy count - only 4 enemies spread across the level
    
    // Ground enemy near start
    this.enemies.add(new BugEnemy(this, 10 * tileSize, 12 * tileSize));
    
    // Flying bat in middle section
    this.enemies.add(new FlyingBat(this, 18 * tileSize, 7 * tileSize));
    
    // Slime on elevated platform
    this.enemies.add(new SlimeCrawler(this, 24 * tileSize, 5 * tileSize));
    
    // Bug enemy near the end
    this.enemies.add(new BugEnemy(this, 30 * tileSize, 12 * tileSize));
  }

  createPickups(): void {
    const tileSize = 64;
    
    // Gun pickup if player doesn't have one yet
    this.createGunPickup(8 * tileSize, 12 * tileSize - 20);
    
    // Health packs
    this.createHealthPickup(16 * tileSize, 12 * tileSize - 20);
    this.createHealthPickup(28 * tileSize, 12 * tileSize - 20);
  }

  createDecorations(): void {
    const tileSize = 64;
    
    // Mushrooms on main ground floor (top at y=12*64=768)
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_1", 4 * tileSize, 12 * tileSize, 48);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_2", 12 * tileSize, 12 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_3", 26 * tileSize, 12 * tileSize, 48);
    
    // Crystals on various platforms
    // Starting left platform (x=1-5, y=9)
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_1", 3 * tileSize, 9 * tileSize, 80);
    
    // Second floating platform (x=13-16, y=6)
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_2", 14 * tileSize, 6 * tileSize, 80);
    
    // High platform (x=22-26, y=5)
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_3", 23 * tileSize, 5 * tileSize, 80);
    
    // Ancient pillars on ground
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_1", 8 * tileSize, 12 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_2", 22 * tileSize, 12 * tileSize, 96);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_2", 32 * tileSize, 12 * tileSize, 96);
    
    // Bone piles scattered
    utils.createDecoration(this, this.decorations, "bone_pile_variant_1", 10 * tileSize, 12 * tileSize, 32);
    utils.createDecoration(this, this.decorations, "bone_pile_variant_2", 18 * tileSize, 12 * tileSize, 40);
    utils.createDecoration(this, this.decorations, "bone_pile_variant_3", 28 * tileSize, 12 * tileSize, 32);
  }
}
