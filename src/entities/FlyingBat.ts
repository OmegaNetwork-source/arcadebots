import Phaser from "phaser";
import * as utils from "../utils";
import { enemyConfig } from "../gameConfig.json";
import { FlyingBatFSM } from "./FlyingBatFSM";

type Direction = "left" | "right";

// Flying Bat Enemy class - a flying enemy that swoops down to attack
export class FlyingBat extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  // State machine
  public fsm: FlyingBatFSM;

  // Character attributes
  public facingDirection: Direction;
  public flySpeed: number;
  public detectionRange: number;
  public homeY: number; // The Y position bat hovers at

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
    super(scene, x, y, "flying_bat_idle_R_frame1");

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize character attributes - bats are flying so no gravity
    this.facingDirection = Math.random() > 0.5 ? "right" : "left";
    this.flySpeed = 80;
    this.detectionRange = enemyConfig.detectionRange.value;
    this.homeY = y; // Remember home Y position for hovering

    // Initialize state flags
    this.isDead = false;
    this.isAttacking = false;
    this.isHurting = false;

    // Initialize attack system
    this.currentMeleeTargets = new Set();
    this.attackDamage = enemyConfig.attackDamage.value * 0.8; // Slightly less damage
    this.attackRange = 80;
    this.attackWidth = 60;
    this.attackCooldown = enemyConfig.attackCooldown.value;
    this.lastAttackTime = 0;
    this.contactDamage = enemyConfig.contactDamage.value;

    // Direction change debounce
    this.lastDirectionChangeTime = 0;
    this.directionChangeDelay = 1000;

    // Initialize health system - less health than bugs
    this.maxHealth = enemyConfig.maxHealth.value * 0.7;
    this.health = this.maxHealth;

    // Flying enemy - no gravity, but affected by physics
    this.body.setGravityY(0);
    this.body.setAllowGravity(false);

    // Use utility function to initialize sprite's size, scale, etc.
    // Bat is smaller
    const standardHeight = 70;
    utils.initScale(this, { x: 0.5, y: 1.0 }, undefined, standardHeight, 0.6, 0.6);

    // Create attack trigger
    this.meleeTrigger = utils.createTrigger(this.scene, this, 0, 0, this.attackRange, this.attackWidth);
    
    // Add meleeTrigger to scene's enemyMeleeTriggers group
    if ((scene as any).enemyMeleeTriggers) {
      (scene as any).enemyMeleeTriggers.add(this.meleeTrigger);
    }

    // Initialize sound effects
    this.initializeSounds();

    // Initialize state machine
    this.fsm = new FlyingBatFSM(scene, this);
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

  // Check if can attack (cooldown)
  public canAttack(): boolean {
    return this.scene.time.now - this.lastAttackTime > this.attackCooldown;
  }

  // Damage method
  public takeDamage(damage: number): void {
    if (this.isDead) return;

    this.health -= damage;
    this.isHurting = true;

    // Spawn blood effect on hit
    const bloodManager = (this.scene as any).bloodEffectManager;
    if (bloodManager) {
      const centerY = this.y - this.body.height / 2;
      bloodManager.spawnBlood(this.x, centerY, 6, false);
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      
      // Spawn extra blood on death
      if (bloodManager) {
        const centerY = this.y - this.body.height / 2;
        bloodManager.spawnBlood(this.x, centerY, 12, true);
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
