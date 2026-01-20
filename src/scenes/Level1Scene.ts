import Phaser from "phaser";
import { BaseLevelScene } from "./BaseLevelScene";
import { ArcadeBot } from "../entities/ArcadeBot";
import { BugEnemy } from "../entities/BugEnemy";
import { FlyingBat } from "../entities/FlyingBat";
import { SlimeCrawler } from "../entities/SlimeCrawler";
import * as utils from "../utils";

export class Level1Scene extends BaseLevelScene {
  // Pit trigger for falling sequence
  public pitTrigger?: Phaser.GameObjects.Zone;
  public pitTriggered: boolean = false;
  // Level exit indicator
  public exitArrow?: Phaser.GameObjects.Image;

  constructor() {
    super({ key: "Level1Scene" });
  }

  create(): void {
    this.pitTriggered = false;
    this.createBaseElements();
    
    // Create pickups
    this.createPickups();
    
    // Create pit trigger at end of level
    this.createPitTrigger();

    // Play background music
    this.backgroundMusic = this.sound.add("cave_exploration_theme", {
      volume: 0.6,
      loop: true
    });
    this.backgroundMusic.play();
  }
  
  // Create a pit trigger at the end of the level
  createPitTrigger(): void {
    const tileSize = 64;
    // Position pit trigger at the end of the level (map is now 80 tiles wide)
    // Map ends at x=80, so we put the pit at x=79
    const pitX = 79 * tileSize;
    const pitY = 11 * tileSize; // Ground level (y=11 is top of final ground section)
    
    // Create invisible trigger zone
    this.pitTrigger = this.add.zone(pitX, pitY, tileSize * 2, tileSize * 4);
    this.physics.add.existing(this.pitTrigger, true);
    
    // Create exit arrow indicator near the pit
    this.createExitIndicator(pitX - tileSize * 2, pitY - tileSize * 4);
    
    // Setup overlap detection with player
    utils.addOverlap(this, this.player, this.pitTrigger, () => {
      if (!this.pitTriggered && !this.player.isDead) {
        this.onPitEntered();
      }
    });
  }
  
  // Create visual exit indicator
  createExitIndicator(x: number, y: number): void {
    // Create exit arrow with glowing effect
    this.exitArrow = this.add.image(x, y, "level_exit_arrow");
    utils.initScale(this.exitArrow, { x: 0.5, y: 0.5 }, 100, 120);
    this.exitArrow.setDepth(5);
    
    // Add floating animation
    this.tweens.add({
      targets: this.exitArrow,
      y: y - 20,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Add pulsing glow effect
    this.tweens.add({
      targets: this.exitArrow,
      alpha: { from: 0.7, to: 1 },
      scaleX: this.exitArrow.scaleX * 1.1,
      scaleY: this.exitArrow.scaleY * 1.1,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Add "EXIT" text above the arrow
    const exitText = this.add.text(x, y - 80, 'EXIT', {
      fontFamily: 'SupercellMagic',
      fontSize: '24px',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    exitText.setOrigin(0.5, 0.5);
    exitText.setDepth(5);
    
    // Animate the text
    this.tweens.add({
      targets: exitText,
      y: y - 100,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Blinking effect for text
    this.tweens.add({
      targets: exitText,
      alpha: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }
  
  // Handle player entering the pit
  onPitEntered(): void {
    this.pitTriggered = true;
    this.gameCompleted = true; // Prevent normal level completion logic
    
    // Disable player input
    this.player.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    
    // Play falling animation
    this.player.playAnimation(this.player.getAnimKey('jump_down'));
    
    // Camera shake to indicate something dramatic
    this.cameras.main.shake(500, 0.02);
    
    // Fade out and transition
    this.time.delayedCall(500, () => {
      // Stop music
      this.backgroundMusic?.stop();
      
      // Stop UI scene
      this.scene.stop("UIScene");
      
      // Fade to black
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // Start falling sequence scene
        this.scene.start("FallingSequenceScene");
      });
    });
  }

  update(time: number, delta: number): void {
    this.baseUpdate(time, delta);
  }

  // Map size: 80 tiles x 14 tiles = 5120x896 pixels (more vertical, more interesting!)
  setupMapSize(): void {
    this.mapWidth = 80 * 64;  // 5120
    this.mapHeight = 14 * 64;  // 896
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
    this.map = this.make.tilemap({ key: "cave_level_1" });
    this.groundTileset = this.map.addTilesetImage("cave_ground_tileset", "cave_ground_tileset")!;
    this.groundLayer = this.map.createLayer("ground", this.groundTileset, 0, 0)!;
    this.groundLayer.setCollisionByExclusion([-1]);
  }

  createPlayer(): void {
    // Spawn player on starting ground platform, left side
    // Starting ground floor top is at y=11*64=704
    const spawnX = 100;
    const spawnY = 11 * 64; // Standing on starting ground floor
    this.player = new ArcadeBot(this, spawnX, spawnY);
  }

  createEnemies(): void {
    const tileSize = 64;
    
    // Enemies spread across the level with more dynamic placements
    // Map layout: 80 tiles wide x 14 tiles tall with varied platforms
    
    // ===== STARTING AREA (x: 0-12) - Ground at y=11 =====
    this.enemies.add(new BugEnemy(this, 8 * tileSize, 11 * tileSize));
    
    // ===== RAISED PLATFORM AREA (x: 4-9) - Platform at y=8 =====
    this.enemies.add(new SlimeCrawler(this, 6 * tileSize, 8 * tileSize));
    
    // ===== HIGH FLOATING PLATFORM (x: 10-15) - Platform at y=5 =====
    this.enemies.add(new FlyingBat(this, 12 * tileSize, 3 * tileSize));
    
    // ===== GROUND SECTION 2 (x: 14-22) - Ground at y=11 =====
    this.enemies.add(new BugEnemy(this, 18 * tileSize, 11 * tileSize));
    
    // ===== ELEVATED WALKWAY (x: 24-32) - Platform at y=6 =====
    this.enemies.add(new SlimeCrawler(this, 28 * tileSize, 6 * tileSize));
    this.enemies.add(new FlyingBat(this, 30 * tileSize, 3 * tileSize));
    
    // ===== STEPPING STONES AREA (x: 33-44) =====
    this.enemies.add(new FlyingBat(this, 38 * tileSize, 4 * tileSize));
    
    // ===== HIGH RIDGE (x: 45-52) - Platform at y=3 =====
    this.enemies.add(new BugEnemy(this, 48 * tileSize, 3 * tileSize));
    
    // ===== DESCENT AREA (x: 52-58) =====
    this.enemies.add(new FlyingBat(this, 56 * tileSize, 5 * tileSize));
    
    // ===== LOWER GROUND SECTION (x: 54-66) - Ground at y=12 =====
    this.enemies.add(new SlimeCrawler(this, 60 * tileSize, 12 * tileSize));
    
    // ===== FINAL SECTION (x: 70-80) - Ground at y=11 =====
    this.enemies.add(new BugEnemy(this, 73 * tileSize, 11 * tileSize));
  }

  createPickups(): void {
    const tileSize = 64;
    
    // Gun pickup on raised platform above start (x: 4-9, y=8)
    this.createGunPickup(6 * tileSize, 8 * tileSize - 20);
    
    // Health packs spread throughout the level at strategic locations
    // On ground section 2 (x: 14-22, y=11)
    this.createHealthPickup(16 * tileSize, 11 * tileSize - 20);
    // On high ridge platform (x: 45-52, y=3) - reward for climbing
    this.createHealthPickup(47 * tileSize, 3 * tileSize - 20);
    // On lower ground section (x: 54-66, y=12)
    this.createHealthPickup(58 * tileSize, 12 * tileSize - 20);
    // Near final section (x: 70-80, y=11)
    this.createHealthPickup(72 * tileSize, 11 * tileSize - 20);
  }

  createDecorations(): void {
    const tileSize = 64;
    
    // Spread decorations throughout the level on various platforms
    // Heights: mushrooms ~48-64, crystals ~80, pillars ~64-96, bones ~32-40
    
    // ===== STARTING AREA (x: 0-12, ground at y=11) =====
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_1", 2 * tileSize, 11 * tileSize, 48);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_2", 10 * tileSize, 11 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_1", 3 * tileSize, 11 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "bone_pile_variant_1", 9 * tileSize, 11 * tileSize, 32);
    
    // ===== RAISED PLATFORM (x: 4-9, platform at y=8) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_1", 5 * tileSize, 8 * tileSize, 80);
    
    // ===== HIGH FLOATING PLATFORM (x: 10-15, platform at y=5) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_2", 12 * tileSize, 5 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_3", 14 * tileSize, 5 * tileSize, 48);
    
    // ===== GROUND SECTION 2 (x: 14-22, ground at y=11) =====
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_1", 16 * tileSize, 11 * tileSize, 48);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_2", 20 * tileSize, 11 * tileSize, 96);
    utils.createDecoration(this, this.decorations, "bone_pile_variant_2", 15 * tileSize, 11 * tileSize, 40);
    
    // ===== MEDIUM PLATFORM (x: 18-24, platform at y=8) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_3", 21 * tileSize, 8 * tileSize, 80);
    
    // ===== ELEVATED WALKWAY (x: 24-32, platform at y=6) =====
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_2", 26 * tileSize, 6 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_1", 29 * tileSize, 6 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_1", 31 * tileSize, 6 * tileSize, 64);
    
    // ===== GROUND PIT AREA (x: 26-34, ground at y=12) =====
    utils.createDecoration(this, this.decorations, "bone_pile_variant_3", 28 * tileSize, 12 * tileSize, 32);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_1", 32 * tileSize, 12 * tileSize, 48);
    
    // ===== STEPPING STONES (x: 33-44, platforms at y=9, y=7, y=5) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_2", 34 * tileSize, 9 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_3", 38 * tileSize, 7 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_3", 42 * tileSize, 5 * tileSize, 48);
    
    // ===== HIGH RIDGE (x: 45-52, platform at y=3) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_1", 46 * tileSize, 3 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_2", 49 * tileSize, 3 * tileSize, 96);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_1", 51 * tileSize, 3 * tileSize, 48);
    
    // ===== DESCENT PLATFORMS (x: 52-58, platforms at y=6, y=8) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_2", 53 * tileSize, 6 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_2", 56 * tileSize, 8 * tileSize, 64);
    
    // ===== LOWER GROUND SECTION (x: 54-66, ground at y=12) =====
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_3", 56 * tileSize, 12 * tileSize, 48);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_1", 62 * tileSize, 12 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "bone_pile_variant_1", 59 * tileSize, 12 * tileSize, 32);
    utils.createDecoration(this, this.decorations, "bone_pile_variant_2", 64 * tileSize, 12 * tileSize, 40);
    
    // ===== MEDIUM PLATFORM BEFORE FINALE (x: 60-65, platform at y=9) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_3", 62 * tileSize, 9 * tileSize, 80);
    
    // ===== FINAL HIGH PLATFORM (x: 66-72, platform at y=6) =====
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_1", 68 * tileSize, 6 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_2", 70 * tileSize, 6 * tileSize, 96);
    
    // ===== FINAL GROUND SECTION (x: 70-80, ground at y=11) =====
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_1", 72 * tileSize, 11 * tileSize, 48);
    utils.createDecoration(this, this.decorations, "cave_mushroom_variant_2", 76 * tileSize, 11 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "ancient_pillar_variant_1", 74 * tileSize, 11 * tileSize, 64);
    utils.createDecoration(this, this.decorations, "cave_crystal_variant_2", 77 * tileSize, 8 * tileSize, 80);
    utils.createDecoration(this, this.decorations, "bone_pile_variant_3", 75 * tileSize, 11 * tileSize, 32);
  }
}
