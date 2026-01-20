import Phaser from "phaser";
import * as utils from "../utils";
import { enemyConfig } from "../gameConfig.json";
import { SlimeCrawlerFSM } from "./SlimeCrawlerFSM";
import { EnemyBullet } from "./EnemyBullet";

type Direction = "left" | "right";

// Slime Crawler Enemy class - a slow ground enemy that lunges to attack
export class SlimeCrawler extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  // State machine
  public fsm: SlimeCrawlerFSM;

  // Character attributes
  public facingDirection: Direction;
  public walkSpeed: number;
  public detectionRange: number;

  // State flags
  public isDead: boolean;
  public isAttacking: boolean;
  public isHurting: boolean;

  // Attack system
  public currentMeleeTargets: Set<any>;
  public attackDamage: number;
  public attackRange: number;
  public attackWidth: number;
  public attackCooldown: number;
  public lastAttackTime: number;
  public contactDamage: number;

  // Ranged attack system (eye laser)
  public rangedAttackCooldown: number;
  public lastRangedAttackTime: number;
  public rangedAttackRange: number;

  // Direction change debounce
  public lastDirectionChangeTime: number;
  public directionChangeDelay: number;

  // Health system
  public maxHealth: number;
  public health: number;

  // Attack trigger
  public meleeTrigger: Phaser.GameObjects.Zone;

  // Sound effects
  public attackSound?: Phaser.Sound.BaseSound;
  public hurtSound?: Phaser.Sound.BaseSound;
  public dieSound?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "slime_crawler_idle_R_frame1");

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize character attributes - slimes are slow
    this.facingDirection = Math.random() > 0.5 ? "right" : "left";
    this.walkSpeed = 40; // Very slow
    this.detectionRange = enemyConfig.detectionRange.value * 0.8;

    // Initialize state flags
    this.isDead = false;
    this.isAttacking = false;
    this.isHurting = false;

    // Initialize attack system
    this.currentMeleeTargets = new Set();
    this.attackDamage = enemyConfig.attackDamage.value * 1.2; // More damage
    this.attackRange = 70;
    this.attackWidth = 80;
    this.attackCooldown = enemyConfig.attackCooldown.value * 1.5; // Slower attacks
    this.lastAttackTime = 0;
    this.contactDamage = enemyConfig.contactDamage.value * 1.2;

    // Initialize ranged attack system
    this.rangedAttackCooldown = 2500; // 2.5 seconds between shots
    this.lastRangedAttackTime = 0;
    this.rangedAttackRange = 400; // Shoot from further away

    // Direction change debounce
    this.lastDirectionChangeTime = 0;
    this.directionChangeDelay = 1500; // Slower to turn

    // Initialize health system - more tanky
    this.maxHealth = enemyConfig.maxHealth.value * 1.5;
    this.health = this.maxHealth;

    // Set physics properties - affected by gravity
    this.body.setGravityY(enemyConfig.gravityY.value);

    // Use utility function to initialize sprite's size, scale, etc.
    // Slime is shorter and wider
    const standardHeight = 60;
    utils.initScale(this, { x: 0.5, y: 1.0 }, undefined, standardHeight, 0.8, 0.6);

    // Create attack trigger
    this.meleeTrigger = utils.createTrigger(this.scene, this, 0, 0, this.attackRange, this.attackWidth);
    
    // Add meleeTrigger to scene's enemyMeleeTriggers group
    if ((scene as any).enemyMeleeTriggers) {
      (scene as any).enemyMeleeTriggers.add(this.meleeTrigger);
    }

    // Initialize sound effects
    this.initializeSounds();

    // Initialize state machine
    this.fsm = new SlimeCrawlerFSM(scene, this);
  }

  // Play animation and reset origin and offset
  public playAnimation(animKey: string): void {
    if (this.anims.currentAnim?.key !== animKey) {
      this.play(animKey, true);
    }
    utils.resetOriginAndOffset(this, this.facingDirection);
  }

  // Main update method - called every frame
  public update(): void {
    // Safety check
    if (!this.body || !this.active || this.isDead) {
      return;
    }

    // Update attack trigger position
    utils.updateMeleeTrigger(this, this.meleeTrigger, this.facingDirection, this.attackRange, this.attackWidth);

    // Use state machine update
    this.fsm.update(0, 0);
  }

  // Check if can melee attack (cooldown)
  public canAttack(): boolean {
    return this.scene.time.now - this.lastAttackTime > this.attackCooldown;
  }

  // Check if can ranged attack (cooldown)
  public canRangedAttack(): boolean {
    return this.scene.time.now - this.lastRangedAttackTime > this.rangedAttackCooldown;
  }

  // Get eye position for shooting laser (the eye is on the stalk at the top of the slime)
  public getEyePosition(): { x: number; y: number } {
    // The eye is at the top of the slime, slightly offset in facing direction
    const eyeOffsetX = this.facingDirection === "right" ? 10 : -10;
    // Eye is near the top of the sprite (about 85% up from the bottom)
    const eyeY = this.y - this.body.height * 0.85;
    return {
      x: this.x + eyeOffsetX,
      y: eyeY
    };
  }

  // Shoot laser from eye
  public shootLaser(): void {
    this.lastRangedAttackTime = this.scene.time.now;
    
    const eyePos = this.getEyePosition();
    const direction = this.facingDirection === "right" ? 1 : -1;
    
    // Create enemy bullet from eye position
    const bullet = new EnemyBullet(this.scene, eyePos.x, eyePos.y, direction);
    
    // Add to scene's enemyBullets group if it exists
    const gameScene = this.scene as any;
    if (gameScene.enemyBullets) {
      gameScene.enemyBullets.add(bullet);
    }
    
    // Fire the bullet (sets velocity)
    bullet.fire();
    
    // Play attack sound
    this.attackSound?.play();
  }

  // Damage method
  public takeDamage(damage: number): void {
    if (this.isDead) return;

    this.health -= damage;
    this.isHurting = true;

    // Spawn green slime effect on hit (using blood with green tint)
    const bloodManager = (this.scene as any).bloodEffectManager;
    if (bloodManager) {
      const centerY = this.y - this.body.height / 2;
      bloodManager.spawnBlood(this.x, centerY, 6, false);
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      
      // Spawn extra splatter on death
      if (bloodManager) {
        const centerY = this.y - this.body.height / 2;
        bloodManager.spawnBlood(this.x, centerY, 15, true);
      }
      
      this.fsm.goto("dying");
    } else {
      this.fsm.goto("hurting");
    }
  }

  // Initialize sound effects
  private initializeSounds(): void {
    this.attackSound = this.scene.sound.add("enemy_attack", {
      volume: 0.3,
    });
    this.hurtSound = this.scene.sound.add("enemy_hurt", {
      volume: 0.3,
    });
    this.dieSound = this.scene.sound.add("enemy_die", {
      volume: 0.3,
    });
  }
}
