import Phaser from "phaser";
import { ArcadeBot } from "../entities/ArcadeBot";
import { scoreManager } from "../wallet/ScoreManager";
import * as utils from "../utils";

/**
 * Falling Sequence Scene - 30 second dodge section where player falls and avoids hazards
 */
export class FallingSequenceScene extends Phaser.Scene {
  public player!: ArcadeBot;
  public hazards!: Phaser.GameObjects.Group;
  public backgrounds!: Phaser.GameObjects.Group;

  // Input
  public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // Timing
  public fallDuration: number = 30000; // 30 seconds
  public elapsedTime: number = 0;
  public hazardSpawnTimer: number = 0;
  public hazardSpawnInterval: number = 400; // Spawn hazard every 400ms

  // Sounds
  public windSound?: Phaser.Sound.BaseSound;
  public debrisSound?: Phaser.Sound.BaseSound;

  // Background scrolling
  public bgScrollSpeed: number = 10;

  // Game state
  public isComplete: boolean = false;

  constructor() {
    super({ key: "FallingSequenceScene" });
  }

  create(): void {
    this.isComplete = false;
    this.elapsedTime = 0;
    this.hazardSpawnTimer = 0;

    // Create scrolling backgrounds
    this.createScrollingBackground();

    // Create hazard group
    this.hazards = this.add.group();

    // Create player in center of screen
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.player = new ArcadeBot(this, centerX, centerY);

    // Override player's gravity for falling scene - player floats in the middle
    this.player.body.setGravityY(-1200); // Cancel out default gravity
    this.player.body.setAllowGravity(false);

    // Keep player in bounds
    this.player.setCollideWorldBounds(true);

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Setup collision between player and hazards
    utils.addOverlap(this, this.player, this.hazards, this.onHazardHit, undefined, this);

    // Play wind sound looping
    this.initializeSounds();
    this.windSound?.play();

    // Launch UI scene for falling sequence
    this.scene.launch("FallingUIScene", { fallingSceneKey: this.scene.key });
  }

  initializeSounds(): void {
    this.windSound = this.sound.add("falling_wind", {
      volume: 0.5,
      loop: true
    });
    this.debrisSound = this.sound.add("debris_whoosh", {
      volume: 0.3
    });
  }

  createScrollingBackground(): void {
    this.backgrounds = this.add.group();

    // Create a solid dark background that covers the entire screen
    // This simulates falling through a dark void/abyss
    const darkOverlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x0a0a0f // Very dark blue-black color
    );
    darkOverlay.setDepth(-200);

    // Add some subtle vertical lines/particles to simulate falling motion
    // Create scrolling dark gradient lines for motion effect
    for (let i = 0; i < 3; i++) {
      const motionLine = this.add.rectangle(
        this.scale.width / 2,
        i * this.scale.height,
        this.scale.width,
        this.scale.height,
        0x0f0f18
      );
      motionLine.setDepth(-150);
      motionLine.setAlpha(0.5);
      this.backgrounds.add(motionLine);
    }

    // Add some ambient dust particles floating up to enhance falling feel
    this.createFallingParticles();
  }

  createFallingParticles(): void {
    // Create some small dots that scroll up to simulate falling
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height * 2);
      const particle = this.add.circle(x, y, Phaser.Math.Between(1, 3), 0x333344, 0.5);
      particle.setDepth(-100);
      this.backgrounds.add(particle);
    }
  }

  update(time: number, delta: number): void {
    if (this.isComplete) return;

    // Update elapsed time
    this.elapsedTime += delta;

    // Check if 30 seconds have passed
    if (this.elapsedTime >= this.fallDuration) {
      this.onFallingComplete();
      return;
    }

    // Update player movement (left/right only during falling)
    this.updatePlayerMovement();

    // Scroll backgrounds upward to simulate falling
    this.scrollBackgrounds(delta);

    // Spawn hazards
    this.hazardSpawnTimer += delta;
    if (this.hazardSpawnTimer >= this.hazardSpawnInterval) {
      this.spawnHazard();
      this.hazardSpawnTimer = 0;

      // Increase spawn rate over time
      this.hazardSpawnInterval = Math.max(200, 400 - (this.elapsedTime / 30000) * 200);
    }

    // Update hazards (move them upward)
    this.updateHazards(delta);

    // Update player animation - use jump_down since player is falling
    this.player.playAnimation(this.player.getAnimKey('jump_down'));
    this.player.setFlipX(this.player.facingDirection === "left");

    // Add slight downward movement to player to emphasize falling
    // This is visual only - player stays in center vertically
    if (!this.cursors.up.isDown && !this.cursors.down.isDown) {
      // Small bob effect to simulate falling
    }
  }

  updatePlayerMovement(): void {
    const moveSpeed = 400;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-moveSpeed);
      this.player.facingDirection = "left";
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(moveSpeed);
      this.player.facingDirection = "right";
    } else {
      this.player.setVelocityX(0);
    }

    // Also allow slight up/down movement
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-200);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(200);
    } else {
      this.player.setVelocityY(0);
    }
  }

  scrollBackgrounds(delta: number): void {
    const scrollAmount = this.bgScrollSpeed * (delta / 16);

    this.backgrounds.children.iterate((bg: any) => {
      // Scroll DOWN (player is falling down, so backgrounds move up relative to player)
      bg.y -= scrollAmount;

      // Reset background position for seamless loop
      if (bg.y < -this.scale.height) {
        bg.y += this.scale.height * 3;
      }
      return true;
    });
  }

  spawnHazard(): void {
    // Random x position
    const x = Phaser.Math.Between(50, this.scale.width - 50);
    const y = -100; // Spawn ABOVE screen (player is falling DOWN)

    // Create warning indicator at TOP of screen
    const warning = this.add.image(x, 50, "warning_indicator");
    utils.initScale(warning, { x: 0.5, y: 0.5 }, 30, 30);
    warning.setAlpha(0.8);
    warning.setDepth(10);

    // Blink the warning
    this.tweens.add({
      targets: warning,
      alpha: { from: 0.8, to: 0.2 },
      duration: 100,
      repeat: 3,
      yoyo: true,
      onComplete: () => {
        warning.destroy();
      }
    });

    // Spawn actual hazard after warning
    this.time.delayedCall(300, () => {
      if (this.isComplete) return;

      // Randomly choose hazard type
      const hazardType = Phaser.Math.Between(0, 1);
      let hazard: Phaser.Physics.Arcade.Sprite;

      if (hazardType === 0) {
        hazard = this.physics.add.sprite(x, y, "falling_spike");
        utils.initScale(hazard, { x: 0.5, y: 0 }, 40, 80);
        // Flip spike to point down since it's coming from above
        hazard.setFlipY(true);
      } else {
        hazard = this.physics.add.sprite(x, y, "falling_debris");
        utils.initScale(hazard, { x: 0.5, y: 0.5 }, 60, 60);
        // Add rotation to debris
        hazard.setAngularVelocity(Phaser.Math.Between(-100, 100));
      }

      (hazard.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      // Hazards move DOWN towards player (positive velocity)
      (hazard.body as Phaser.Physics.Arcade.Body).setVelocityY(600);

      this.hazards.add(hazard);

      // Play debris sound
      this.debrisSound?.play();
    });
  }

  updateHazards(delta: number): void {
    this.hazards.children.iterate((hazard: any) => {
      if (!hazard) return true;

      // Remove hazards that are off screen (below the screen now)
      if (hazard.y > this.scale.height + 100) {
        hazard.destroy();
      }
      return true;
    });
  }

  onHazardHit(player: any, hazard: any): void {
    if (player.isInvulnerable || player.isDead) return;

    // Player takes damage
    player.takeDamage(15);

    // Destroy the hazard
    hazard.destroy();

    // Check if player died
    if (player.health <= 0) {
      this.onPlayerDeath();
    }
  }

  onPlayerDeath(): void {
    this.isComplete = true;
    this.windSound?.stop();

    // Stop player
    this.player.setVelocity(0, 0);
    this.player.isDead = true;
    this.player.playAnimation(this.player.getAnimKey('die'));
    this.player.dieSound?.play();

    // Stop falling UI
    this.scene.stop("FallingUIScene");

    // Show game over
    this.time.delayedCall(1000, () => {
      this.scene.launch("GameOverUIScene", { currentLevelKey: "Level1Scene" });
    });
  }

  onFallingComplete(): void {
    if (this.isComplete) return;
    this.isComplete = true;

    // Award score for surviving the fall!
    scoreManager.addFallingSurvivalScore();

    // Stop wind sound
    this.windSound?.stop();

    // Stop spawning hazards
    this.hazards.clear(true, true);

    // Fade out and transition to boss arena
    this.cameras.main.fadeOut(1000, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Stop falling UI
      this.scene.stop("FallingUIScene");

      // Start boss arena scene
      this.scene.start("BossArenaScene");
    });
  }

  // Get remaining time for UI
  getRemainingTime(): number {
    return Math.max(0, (this.fallDuration - this.elapsedTime) / 1000);
  }
}
