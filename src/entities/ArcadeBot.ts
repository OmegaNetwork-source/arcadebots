import Phaser from "phaser";
import * as utils from "../utils";
import { playerConfig } from "../gameConfig.json";
import { PlayerFSM } from "./PlayerFSM";
import { Bullet } from "./Bullet";

type Direction = "left" | "right";

// Character variant type - includes all 11 bot variants
export type CharacterVariant = 'arcade_bot' | 'fire_arcade_bot' | 'ice_arcade_bot' | 'shadow_arcade_bot' | 'lightning_arcade_bot' | 'nature_arcade_bot' | 'cosmic_arcade_bot' | 'goku_arcade_bot' | 'grim_reaper_arcade_bot' | 'angel_arcade_bot' | 'devil_arcade_bot';

// Animation key mapping for each variant
const ANIMATION_KEYS: Record<CharacterVariant, {
  idle: string;
  walk: string;
  jump_up: string;
  jump_down: string;
  attack: string;
  die: string;
}> = {
  arcade_bot: {
    idle: 'arcade_bot_idle_anim',
    walk: 'arcade_bot_walk_anim',
    jump_up: 'arcade_bot_jump_up_anim',
    jump_down: 'arcade_bot_jump_down_anim',
    attack: 'arcade_bot_attack_anim',
    die: 'arcade_bot_die_anim'
  },
  fire_arcade_bot: {
    idle: 'fire_arcade_bot_idle_anim',
    walk: 'fire_arcade_bot_walk_anim',
    jump_up: 'fire_arcade_bot_jump_up_anim',
    jump_down: 'fire_arcade_bot_jump_down_anim',
    attack: 'fire_arcade_bot_attack_anim',
    die: 'fire_arcade_bot_die_anim'
  },
  ice_arcade_bot: {
    idle: 'ice_arcade_bot_idle_anim',
    walk: 'ice_arcade_bot_walk_anim',
    jump_up: 'ice_arcade_bot_jump_up_anim',
    jump_down: 'ice_arcade_bot_jump_down_anim',
    attack: 'ice_arcade_bot_attack_anim',
    die: 'ice_arcade_bot_die_anim'
  },
  shadow_arcade_bot: {
    idle: 'shadow_arcade_bot_idle_anim',
    walk: 'shadow_arcade_bot_walk_anim',
    jump_up: 'shadow_arcade_bot_jump_up_anim',
    jump_down: 'shadow_arcade_bot_jump_down_anim',
    attack: 'shadow_arcade_bot_attack_anim',
    die: 'shadow_arcade_bot_die_anim'
  },
  lightning_arcade_bot: {
    idle: 'lightning_arcade_bot_idle_anim',
    walk: 'lightning_arcade_bot_walk_anim',
    jump_up: 'lightning_arcade_bot_jump_up_anim',
    jump_down: 'lightning_arcade_bot_jump_down_anim',
    attack: 'lightning_arcade_bot_attack_anim',
    die: 'lightning_arcade_bot_die_anim'
  },
  nature_arcade_bot: {
    idle: 'nature_arcade_bot_idle_anim',
    walk: 'nature_arcade_bot_walk_anim',
    jump_up: 'nature_arcade_bot_jump_up_anim',
    jump_down: 'nature_arcade_bot_jump_down_anim',
    attack: 'nature_arcade_bot_attack_anim',
    die: 'nature_arcade_bot_die_anim'
  },
  cosmic_arcade_bot: {
    idle: 'cosmic_arcade_bot_idle_anim',
    walk: 'cosmic_arcade_bot_walk_anim',
    jump_up: 'cosmic_arcade_bot_jump_up_anim',
    jump_down: 'cosmic_arcade_bot_jump_down_anim',
    attack: 'cosmic_arcade_bot_attack_anim',
    die: 'cosmic_arcade_bot_die_anim'
  },
  goku_arcade_bot: {
    idle: 'goku_arcade_bot_idle_anim',
    walk: 'goku_arcade_bot_walk_anim',
    jump_up: 'goku_arcade_bot_jump_up_anim',
    jump_down: 'goku_arcade_bot_jump_down_anim',
    attack: 'goku_arcade_bot_attack_anim',
    die: 'goku_arcade_bot_die_anim'
  },
  grim_reaper_arcade_bot: {
    idle: 'grim_reaper_arcade_bot_idle_anim',
    walk: 'grim_reaper_arcade_bot_walk_anim',
    jump_up: 'grim_reaper_arcade_bot_jump_up_anim',
    jump_down: 'grim_reaper_arcade_bot_jump_down_anim',
    attack: 'grim_reaper_arcade_bot_attack_anim',
    die: 'grim_reaper_arcade_bot_die_anim'
  },
  angel_arcade_bot: {
    idle: 'angel_arcade_bot_idle_anim',
    walk: 'angel_arcade_bot_walk_anim',
    jump_up: 'angel_arcade_bot_jump_up_anim',
    jump_down: 'angel_arcade_bot_jump_down_anim',
    attack: 'angel_arcade_bot_attack_anim',
    die: 'angel_arcade_bot_die_anim'
  },
  devil_arcade_bot: {
    idle: 'devil_arcade_bot_idle_anim',
    walk: 'devil_arcade_bot_walk_anim',
    jump_up: 'devil_arcade_bot_jump_up_anim',
    jump_down: 'devil_arcade_bot_jump_down_anim',
    attack: 'devil_arcade_bot_attack_anim',
    die: 'devil_arcade_bot_die_anim'
  }
};

// Arcade Bot player class - inherits from Phaser physics sprite
export class ArcadeBot extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  // State machine
  public fsm: PlayerFSM;

  // Character attributes
  public facingDirection: Direction;
  public walkSpeed: number;
  public jumpPower: number;

  // State flags
  public isDead: boolean;
  public isAttacking: boolean;
  public isHurting: boolean;
  public isInvulnerable: boolean;
  public hurtingDuration: number;
  public invulnerableTime: number;
  public hurtingTimer?: Phaser.Time.TimerEvent;

  // Attack target tracking system
  public currentMeleeTargets: Set<any>;
  public attackDamage: number;
  public attackRange: number;
  public attackWidth: number;

  // Health system
  public maxHealth: number;
  public health: number;

  // Attack trigger
  public meleeTrigger: Phaser.GameObjects.Zone;

  // Sound effects
  public jumpSound?: Phaser.Sound.BaseSound;
  public slashSound?: Phaser.Sound.BaseSound;
  public hurtSound?: Phaser.Sound.BaseSound;
  public dieSound?: Phaser.Sound.BaseSound;

  // Input references
  public cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  public spaceKey?: Phaser.Input.Keyboard.Key;
  public shootKey?: Phaser.Input.Keyboard.Key;

  // Weapon system
  public hasGun: boolean;
  public gunCooldown: number;
  public lastShootTime: number;
  
  // Jetpack system
  public hasJetpack: boolean;
  public jetpackFuel: number;
  public maxJetpackFuel: number;
  public isJetpacking: boolean;
  public jetpackSound?: Phaser.Sound.BaseSound;
  
  // Ducking system
  public isDucking: boolean;
  public normalBodyHeight: number;
  public duckBodyHeight: number;

  // Character variant
  public characterVariant: CharacterVariant;
  public animKeys: typeof ANIMATION_KEYS[CharacterVariant];

  constructor(scene: Phaser.Scene, x: number, y: number, variant?: CharacterVariant) {
    // Determine variant from registry or use default
    const selectedVariant = variant || scene.registry.get('selectedCharacter') as CharacterVariant || 'arcade_bot';
    const initialFrame = `${selectedVariant}_idle_R_frame1`;
    
    super(scene, x, y, initialFrame);
    
    // Store variant and get animation keys
    this.characterVariant = selectedVariant;
    this.animKeys = ANIMATION_KEYS[selectedVariant];

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize character attributes
    this.facingDirection = "right";
    this.walkSpeed = playerConfig.walkSpeed.value;
    this.jumpPower = playerConfig.jumpPower.value;

    // Initialize state flags
    this.isDead = false;
    this.isAttacking = false;
    this.isHurting = false;
    this.isInvulnerable = false;
    this.hurtingDuration = playerConfig.hurtingDuration.value;
    this.invulnerableTime = playerConfig.invulnerableTime.value;

    // Initialize attack system
    this.currentMeleeTargets = new Set();
    this.attackDamage = playerConfig.attackDamage.value;
    this.attackRange = playerConfig.attackRange.value;
    this.attackWidth = playerConfig.attackWidth.value;

    // Initialize health system
    this.maxHealth = playerConfig.maxHealth.value;
    this.health = this.maxHealth;

    // Set physics properties
    this.body.setGravityY(playerConfig.gravityY.value);

    // Use utility function to initialize sprite's size, scale, etc.
    // Standard height for player is 128px (1 person height)
    const standardHeight = 128;
    utils.initScale(this, { x: 0.5, y: 1.0 }, undefined, standardHeight, 0.6, 0.85);

    // Create attack trigger
    this.meleeTrigger = utils.createTrigger(this.scene, this, 0, 0, this.attackRange, this.attackWidth);

    // Initialize weapon system
    this.hasGun = false;
    this.gunCooldown = 300; // 300ms between shots
    this.lastShootTime = 0;
    
    // Initialize jetpack system
    this.hasJetpack = false;
    this.jetpackFuel = 100;
    this.maxJetpackFuel = 100;
    this.isJetpacking = false;
    
    // Initialize ducking system
    this.isDucking = false;
    this.normalBodyHeight = this.body.height;
    this.duckBodyHeight = this.body.height * 0.5;

    // Initialize sound effects
    this.initializeSounds();
    
    // Store normal body height after initScale sets it
    this.normalBodyHeight = this.body.height;
    this.duckBodyHeight = this.body.height * 0.5;

    // Initialize state machine
    this.fsm = new PlayerFSM(scene, this);
  }

  // Get animation key for current variant
  public getAnimKey(action: 'idle' | 'walk' | 'jump_up' | 'jump_down' | 'attack' | 'die'): string {
    return this.animKeys[action];
  }

  // Play animation and reset origin and offset
  public playAnimation(animKey: string): void {
    if (this.anims.currentAnim?.key !== animKey) {
      this.play(animKey, true);
    }
    utils.resetOriginAndOffset(this, this.facingDirection);
  }

  // Main update method - called every frame
  public update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    spaceKey: Phaser.Input.Keyboard.Key,
    shootKey?: Phaser.Input.Keyboard.Key
  ): void {
    // Save input references
    this.cursors = cursors;
    this.spaceKey = spaceKey;
    this.shootKey = shootKey;

    // Safety check
    if (!this.body || !this.active) {
      return;
    }

    // Handle shooting (separate from melee)
    if (this.hasGun && this.shootKey && Phaser.Input.Keyboard.JustDown(this.shootKey)) {
      this.tryShoot();
    }
    
    // Handle ducking (down arrow while on ground)
    this.handleDucking();
    
    // Handle jetpack (hold up in air with jetpack)
    this.handleJetpack();

    // Update attack trigger position
    utils.updateMeleeTrigger(this, this.meleeTrigger, this.facingDirection, this.attackRange, this.attackWidth);

    // Use state machine update
    this.fsm.update(0, 0);
  }
  
  // Handle ducking input
  public handleDucking(): void {
    if (!this.cursors) return;
    
    const onGround = this.body.blocked.down || this.body.touching.down;
    
    if (this.cursors.down.isDown && onGround && !this.isAttacking) {
      if (!this.isDucking) {
        this.isDucking = true;
        // Shrink hitbox while ducking
        this.body.setSize(this.body.width, this.duckBodyHeight);
        this.body.setOffset(this.body.offset.x, this.normalBodyHeight - this.duckBodyHeight);
      }
    } else {
      if (this.isDucking) {
        this.isDucking = false;
        // Restore normal hitbox
        this.body.setSize(this.body.width, this.normalBodyHeight);
        this.body.setOffset(this.body.offset.x, 0);
      }
    }
  }
  
  // Handle jetpack flying
  public handleJetpack(): void {
    if (!this.hasJetpack || !this.cursors) return;
    
    const onGround = this.body.blocked.down || this.body.touching.down;
    
    // Recharge fuel on ground
    if (onGround) {
      this.jetpackFuel = Math.min(this.maxJetpackFuel, this.jetpackFuel + 0.5);
      this.isJetpacking = false;
    }
    
    // Use jetpack when holding up and not on ground
    if (this.cursors.up.isDown && this.jetpackFuel > 0) {
      this.isJetpacking = true;
      this.jetpackFuel -= 1;
      
      // Apply upward thrust
      this.body.setVelocityY(Math.max(this.body.velocity.y - 50, -300));
      
      // Play jetpack sound occasionally
      if (!this.jetpackSound?.isPlaying) {
        this.jetpackSound?.play();
      }
    } else {
      this.isJetpacking = false;
    }
  }

  // Try to shoot (if has gun and cooldown is ready)
  public tryShoot(): void {
    if (!this.hasGun || this.isDead) return;
    
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastShootTime < this.gunCooldown) return;
    
    this.lastShootTime = currentTime;
    
    // Get bullet spawn position from body center
    const centerY = this.y - this.body.height / 2;
    const direction = this.facingDirection === "right" ? 1 : -1;
    const spawnX = this.x + (direction * 30);
    
    // Create bullet
    const bullet = new Bullet(this.scene, spawnX, centerY, direction);
    
    // Add to scene's bullets group if it exists
    const gameScene = this.scene as any;
    if (gameScene.bullets) {
      gameScene.bullets.add(bullet);
    }
    
    // Fire the bullet (sets velocity)
    bullet.fire();
  }

  // Equip gun
  public equipGun(): void {
    this.hasGun = true;
  }
  
  // Equip jetpack
  public equipJetpack(): void {
    this.hasJetpack = true;
    this.jetpackFuel = this.maxJetpackFuel;
  }
  
  // Get jetpack fuel percentage
  public getJetpackFuelPercentage(): number {
    return (this.jetpackFuel / this.maxJetpackFuel) * 100;
  }

  // Heal player
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Damage method
  public takeDamage(damage: number): void {
    if (this.isInvulnerable || this.isDead) return;

    this.health -= damage;
    this.isHurting = true;
    this.isInvulnerable = true;

    // Switch to hurt state
    this.fsm.goto("hurting");

    // Blinking effect during invulnerable time
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.3, to: 1 },
      duration: 100,
      repeat: Math.floor(this.invulnerableTime / 200),
      onComplete: () => {
        this.isInvulnerable = false;
        this.alpha = 1;
      }
    });
  }

  // Get health percentage
  public getHealthPercentage(): number {
    return Math.max(0, (this.health / this.maxHealth) * 100);
  }

  // Initialize sound effects
  private initializeSounds(): void {
    this.jumpSound = this.scene.sound.add("player_jump", {
      volume: 0.3,
    });
    this.slashSound = this.scene.sound.add("sword_slash", {
      volume: 0.3,
    });
    this.hurtSound = this.scene.sound.add("player_hurt", {
      volume: 0.3,
    });
    this.dieSound = this.scene.sound.add("player_die", {
      volume: 0.3,
    });
    
    // Add jetpack sound if available
    try {
      this.jetpackSound = this.scene.sound.add("jetpack_boost", {
        volume: 0.3,
      });
    } catch (e) {
      // Jetpack sound not loaded yet
    }
  }
}
