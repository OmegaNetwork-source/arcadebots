import Phaser from "phaser";
import * as utils from "../utils";
import FSM from "phaser3-rex-plugins/plugins/fsm.js";

type Direction = "left" | "right";

/**
 * Corrupted Core Boss - A giant corrupted arcade machine that requires strategic fighting
 * 
 * Boss Mechanics:
 * 1. Boss is INVULNERABLE during normal state
 * 2. Boss cycles through attack patterns: Slam -> Laser Sweep -> Vulnerable
 * 3. Player can ONLY damage boss during "vulnerable" phase after attacks
 * 4. After taking damage, boss becomes angry and speeds up
 */
export class CorruptedBoss extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  // FSM
  public fsm: BossFSM;
  
  // Stats
  public maxHealth: number = 300;
  public health: number = 300;
  public isVulnerable: boolean = false;
  public isDead: boolean = false;
  public facingDirection: Direction = "left";
  public isActive: boolean = false; // Boss won't attack until activated
  
  // Attack properties
  public slamDamage: number = 25;
  public laserDamage: number = 20;
  public contactDamage: number = 15;
  public attackCooldown: number = 3000;
  public lastAttackTime: number = 0;
  public vulnerableDuration: number = 4000; // 4 seconds to attack
  
  // Movement properties
  public moveSpeed: number = 80;
  public targetX: number = 0;
  public isMoving: boolean = false;
  public minX: number = 300; // Left boundary
  public maxX: number = 852; // Right boundary (1152 - 300)
  
  // Attack tracking
  public currentMeleeTargets: Set<any> = new Set();
  public isAttacking: boolean = false;
  
  // Attack trigger zone
  public meleeTrigger!: Phaser.GameObjects.Zone;
  
  // Visual elements
  public vulnerableCore?: Phaser.GameObjects.Sprite;
  public shockwave?: Phaser.Physics.Arcade.Sprite;
  public laser?: Phaser.Physics.Arcade.Sprite;
  
  // Sound effects
  public slamSound?: Phaser.Sound.BaseSound;
  public laserSound?: Phaser.Sound.BaseSound;
  public vulnerableSound?: Phaser.Sound.BaseSound;
  public roarSound?: Phaser.Sound.BaseSound;
  public hurtSound?: Phaser.Sound.BaseSound;
  public dieSound?: Phaser.Sound.BaseSound;
  
  // Attack pattern
  public attackPattern: string[] = ["slam", "laser", "vulnerable"];
  public currentPatternIndex: number = 0;
  public enrageMultiplier: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "corrupted_boss_idle_R_frame1");
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Boss is 3x the size of normal characters (384px tall)
    const bossHeight = 384;
    utils.initScale(this, { x: 0.5, y: 1.0 }, undefined, bossHeight, 0.6, 0.9);
    
    // Boss can move but stays grounded
    this.body.setAllowGravity(false);
    
    // Add glow effect to make boss more visible
    this.setTint(0xffcccc); // Slight red tint
    this.preFX?.addGlow(0xff0000, 2, 0, false, 0.1, 16);
    
    // Create melee trigger for slam attack
    this.meleeTrigger = utils.createTrigger(scene, this, 0, 0, 300, 150);
    
    // Initialize sounds
    this.initializeSounds();
    
    // Initialize FSM (starts in waiting state until activated)
    this.fsm = new BossFSM(scene, this);
  }

  initializeSounds(): void {
    this.slamSound = this.scene.sound.add("boss_slam", { volume: 0.5 });
    this.laserSound = this.scene.sound.add("boss_laser", { volume: 0.4 });
    this.vulnerableSound = this.scene.sound.add("boss_vulnerable", { volume: 0.5 });
    this.roarSound = this.scene.sound.add("boss_roar", { volume: 0.6 });
    this.hurtSound = this.scene.sound.add("enemy_hurt", { volume: 0.4 });
    this.dieSound = this.scene.sound.add("enemy_die", { volume: 0.5 });
  }

  playAnimation(animKey: string): void {
    if (this.anims.currentAnim?.key !== animKey) {
      this.play(animKey, true);
    }
    utils.resetOriginAndOffset(this, this.facingDirection);
  }

  update(playerX: number): void {
    if (this.isDead || !this.isActive) return;
    
    // Face the player
    this.facingDirection = playerX < this.x ? "left" : "right";
    this.setFlipX(this.facingDirection === "left");
    
    // Move towards target position if moving
    if (this.isMoving && !this.isAttacking && !this.isVulnerable) {
      const dx = this.targetX - this.x;
      if (Math.abs(dx) > 10) {
        this.setVelocityX(dx > 0 ? this.moveSpeed : -this.moveSpeed);
      } else {
        this.setVelocityX(0);
        this.isMoving = false;
      }
    } else if (!this.isMoving) {
      this.setVelocityX(0);
    }
    
    // Update melee trigger position
    utils.updateMeleeTrigger(this, this.meleeTrigger, this.facingDirection, 200, 150);
    
    // Update FSM
    this.fsm.update(0, 0);
  }
  
  // Start moving to a new position
  moveToPosition(x: number): void {
    this.targetX = Phaser.Math.Clamp(x, this.minX, this.maxX);
    this.isMoving = true;
  }
  
  // Move towards the player
  moveTowardsPlayer(playerX: number): void {
    // Move to a position near the player but not too close
    const targetDistance = 200; // Keep some distance
    let targetX = playerX > this.x ? playerX - targetDistance : playerX + targetDistance;
    this.moveToPosition(targetX);
  }

  takeDamage(damage: number): void {
    if (!this.isVulnerable || this.isDead) return;
    
    this.health -= damage;
    this.hurtSound?.play();
    
    // Flash red
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.clearTint();
    });
    
    // Check death
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.isVulnerable = false;
      this.fsm.goto("dying");
    }
    
    // Increase enrage multiplier as health drops
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent < 0.3) {
      this.enrageMultiplier = 1.5;
    } else if (healthPercent < 0.6) {
      this.enrageMultiplier = 1.25;
    }
  }

  getHealthPercentage(): number {
    return Math.max(0, (this.health / this.maxHealth) * 100);
  }

  // Create shockwave attack
  createShockwave(direction: number): void {
    const startX = this.x + (direction * 100);
    const startY = this.y;
    
    const shockwave = this.scene.physics.add.sprite(startX, startY, "shockwave_effect");
    utils.initScale(shockwave, { x: direction > 0 ? 0 : 1, y: 1 }, 200, 80);
    shockwave.setFlipX(direction < 0);
    shockwave.body.setAllowGravity(false);
    (shockwave.body as Phaser.Physics.Arcade.Body).setVelocityX(direction * 400 * this.enrageMultiplier);
    (shockwave as any).damage = this.slamDamage;
    
    // Add to scene's hazard group
    const bossScene = this.scene as any;
    if (bossScene.bossHazards) {
      bossScene.bossHazards.add(shockwave);
    }
    
    // Destroy after traveling
    this.scene.time.delayedCall(2000, () => {
      shockwave.destroy();
    });
  }

  // Create laser attack at specific height
  // laserHeight: 'high' (jump to dodge), 'mid' (duck or jump), 'low' (jump to dodge)
  createLaser(laserHeight: 'high' | 'mid' | 'low'): void {
    const bossScene = this.scene as any;
    const arenaHeight = bossScene.arenaHeight || 768;
    const groundY = arenaHeight - 50; // Ground level
    
    // Calculate laser Y based on height - player must jump or duck
    let targetY: number;
    switch (laserHeight) {
      case 'high':
        // High laser - player must duck (crouching height) or stay on ground
        targetY = groundY - 180; // Head height when standing
        break;
      case 'mid':
        // Mid laser - player must jump OR duck
        targetY = groundY - 100; // Chest height
        break;
      case 'low':
        // Low laser - player must jump over
        targetY = groundY - 40; // Leg height
        break;
      default:
        targetY = groundY - 100;
    }
    
    // Create warning line across the entire arena
    const warning = this.scene.add.rectangle(
      bossScene.arenaWidth / 2 || 576,
      targetY,
      bossScene.arenaWidth || 1152,
      20,
      0xff0000,
      0.4
    );
    warning.setDepth(50);
    
    // Add height indicator text
    const heightText = this.scene.add.text(
      50,
      targetY - 30,
      laserHeight === 'low' ? 'JUMP!' : (laserHeight === 'high' ? 'DUCK!' : 'JUMP OR DUCK!'),
      {
        fontFamily: 'SupercellMagic',
        fontSize: '18px',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    heightText.setDepth(51);
    
    // Blink warning
    this.scene.tweens.add({
      targets: [warning, heightText],
      alpha: { from: 0.4, to: 1 },
      duration: 150,
      repeat: 5,
      yoyo: true,
      onComplete: () => {
        warning.destroy();
        heightText.destroy();
        
        // Fire actual laser spanning the entire arena
        const laser = this.scene.physics.add.sprite(
          (bossScene.arenaWidth || 1152) / 2,
          targetY,
          "boss_laser"
        );
        
        const laserWidth = bossScene.arenaWidth || 1152;
        utils.initScale(laser, { x: 0.5, y: 0.5 }, laserWidth, 30);
        laser.body.setAllowGravity(false);
        (laser as any).damage = this.laserDamage;
        laser.setDepth(50);
        
        // Add glow to laser
        laser.preFX?.addGlow(0xff0000, 4, 0, false, 0.2, 16);
        
        // Add to hazards
        if (bossScene.bossHazards) {
          bossScene.bossHazards.add(laser);
        }
        
        // Laser stays for a moment then disappears
        this.scene.time.delayedCall(400, () => {
          laser.destroy();
        });
      }
    });
  }

  // Show vulnerable core
  showVulnerableCore(): void {
    // Create glowing core visual
    const coreX = this.x;
    const coreY = this.y - this.body.height / 2;
    
    this.vulnerableCore = this.scene.add.sprite(coreX, coreY, "vulnerable_core");
    utils.initScale(this.vulnerableCore, { x: 0.5, y: 0.5 }, 80, 80);
    this.vulnerableCore.setDepth(10);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.vulnerableCore,
      scaleX: this.vulnerableCore.scaleX * 1.2,
      scaleY: this.vulnerableCore.scaleY * 1.2,
      duration: 300,
      repeat: -1,
      yoyo: true
    });
  }

  hideVulnerableCore(): void {
    if (this.vulnerableCore) {
      this.vulnerableCore.destroy();
      this.vulnerableCore = undefined;
    }
  }

  destroy(fromScene?: boolean): void {
    this.hideVulnerableCore();
    if (this.meleeTrigger) {
      this.meleeTrigger.destroy();
    }
    super.destroy(fromScene);
  }
}

/**
 * Boss FSM - Manages boss attack patterns and states
 */
class BossFSM extends FSM {
  scene: Phaser.Scene;
  boss: CorruptedBoss;

  constructor(scene: Phaser.Scene, boss: CorruptedBoss) {
    super({
      extend: {
        eventEmitter: new Phaser.Events.EventEmitter(),
      },
    });
    this.scene = scene;
    this.boss = boss;
    
    // Start with waiting state (boss inactive until activated)
    this.goto("waiting");
  }

  // Waiting state - boss is inactive until activated
  enter_waiting(): void {
    this.boss.playAnimation("corrupted_boss_idle_anim");
  }
  
  update_waiting(): void {
    // When boss becomes active, start the intro
    if (this.boss.isActive) {
      this.goto("intro");
    }
  }

  // Intro state - boss roars
  enter_intro(): void {
    this.boss.playAnimation("corrupted_boss_idle_anim");
    this.boss.roarSound?.play();
    
    // Shake camera
    this.scene.cameras.main.shake(500, 0.01);
    
    // After intro, start attacking
    this.scene.time.delayedCall(2000, () => {
      this.goto("idle");
    });
  }

  // Idle state - wait then attack
  enter_idle(): void {
    this.boss.isVulnerable = false;
    this.boss.isAttacking = false;
    this.boss.isMoving = false;
    this.boss.setVelocityX(0);
    this.boss.playAnimation("corrupted_boss_idle_anim");
    
    // Move towards player during idle
    const bossScene = this.scene as any;
    const playerX = bossScene.player?.x || 400;
    this.boss.moveTowardsPlayer(playerX);
    
    // Decide next attack after cooldown
    const cooldown = this.boss.attackCooldown / this.boss.enrageMultiplier;
    
    this.scene.time.delayedCall(cooldown, () => {
      if (this.boss.isDead) return;
      
      // Get next attack from pattern
      const attack = this.boss.attackPattern[this.boss.currentPatternIndex];
      this.boss.currentPatternIndex = (this.boss.currentPatternIndex + 1) % this.boss.attackPattern.length;
      
      this.goto(attack);
    });
  }

  // Slam attack - creates ground shockwave
  enter_slam(): void {
    this.boss.isAttacking = true;
    this.boss.isMoving = false;
    this.boss.setVelocityX(0);
    this.boss.currentMeleeTargets.clear();
    
    // Play slam animation
    this.boss.playAnimation("corrupted_boss_slam_anim");
    this.boss.slamSound?.play();
    
    // Shake camera
    this.scene.cameras.main.shake(300, 0.02);
    
    // Create shockwaves in both directions after animation
    this.scene.time.delayedCall(300, () => {
      if (this.boss.isDead) return;
      
      this.boss.createShockwave(1);  // Right
      this.boss.createShockwave(-1); // Left
    });
    
    // Return to idle after attack
    this.scene.time.delayedCall(1000, () => {
      if (this.boss.isDead) return;
      this.boss.isAttacking = false;
      this.goto("idle");
    });
  }

  // Laser attack - horizontal beams at varied heights that can be dodged
  enter_laser(): void {
    this.boss.isAttacking = true;
    this.boss.laserSound?.play();
    
    // Move boss to a random position first
    const bossScene = this.scene as any;
    const playerX = bossScene.player?.x || 400;
    this.boss.moveTowardsPlayer(playerX);
    
    // Fire lasers at different heights - player must jump or duck
    const laserHeights: ('high' | 'mid' | 'low')[] = ['low', 'high', 'mid'];
    const laserCount = this.boss.enrageMultiplier > 1.25 ? 3 : 2;
    
    for (let i = 0; i < laserCount; i++) {
      this.scene.time.delayedCall(i * 800, () => {
        if (this.boss.isDead) return;
        
        // Pick a random height for each laser
        const height = laserHeights[i % laserHeights.length];
        this.boss.createLaser(height);
      });
    }
    
    // Return to idle after all lasers
    this.scene.time.delayedCall(laserCount * 800 + 600, () => {
      if (this.boss.isDead) return;
      this.boss.isAttacking = false;
      this.goto("idle");
    });
  }

  // Vulnerable state - boss is stunned and can take damage
  enter_vulnerable(): void {
    this.boss.isVulnerable = true;
    this.boss.isAttacking = false;
    this.boss.vulnerableSound?.play();
    
    // Play vulnerable animation
    this.boss.playAnimation("corrupted_boss_vulnerable_anim");
    
    // Show the vulnerable core
    this.boss.showVulnerableCore();
    
    // Emit event for UI
    this.scene.events.emit("bossVulnerable", true);
    
    // After vulnerable duration, return to attacking
    this.scene.time.delayedCall(this.boss.vulnerableDuration / this.boss.enrageMultiplier, () => {
      if (this.boss.isDead) return;
      
      this.boss.hideVulnerableCore();
      this.boss.isVulnerable = false;
      this.scene.events.emit("bossVulnerable", false);
      
      this.goto("idle");
    });
  }

  // Death state
  enter_dying(): void {
    this.boss.isVulnerable = false;
    this.boss.isAttacking = false;
    this.boss.hideVulnerableCore();
    this.boss.dieSound?.play();
    
    // Play death animation
    this.boss.playAnimation("corrupted_boss_die_anim");
    
    // Shake camera dramatically
    this.scene.cameras.main.shake(1000, 0.03);
    
    // Emit death event
    this.scene.time.delayedCall(1500, () => {
      this.scene.events.emit("bossDead");
    });
  }
}
