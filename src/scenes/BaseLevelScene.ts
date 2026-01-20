import Phaser from "phaser";
import { ArcadeBot } from "../entities/ArcadeBot";
import { BugEnemy } from "../entities/BugEnemy";
import { LevelManager } from "../LevelManager";
import { BloodEffectManager } from "../effects/BloodEffect";
import { Pickup } from "../entities/Pickup";
import { Bullet } from "../entities/Bullet";
import { scoreManager } from "../wallet/ScoreManager";
import * as utils from "../utils";

export class BaseLevelScene extends Phaser.Scene {
  // Scene properties
  public gameCompleted: boolean = false;
  public mapWidth: number = 0;
  public mapHeight: number = 0;

  // Game objects
  public player!: ArcadeBot;
  public enemies!: Phaser.GameObjects.Group;
  public enemyMeleeTriggers!: Phaser.GameObjects.Group;
  public decorations!: Phaser.GameObjects.Group;

  // Input controls
  public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  public spaceKey!: Phaser.Input.Keyboard.Key;
  public shootKey!: Phaser.Input.Keyboard.Key;

  // Pickups and bullets
  public pickups!: Phaser.GameObjects.Group;
  public bullets!: Phaser.GameObjects.Group;
  public enemyBullets!: Phaser.GameObjects.Group;

  // Map objects
  public map!: Phaser.Tilemaps.Tilemap;
  public groundTileset!: Phaser.Tilemaps.Tileset;
  public groundLayer!: Phaser.Tilemaps.TilemapLayer;

  // Background music
  public backgroundMusic!: Phaser.Sound.BaseSound;

  // Blood effect manager
  public bloodEffectManager!: BloodEffectManager;

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  createBaseElements(): void {
    this.gameCompleted = false;
    this.setupMapSize();
    this.createBackground();
    this.createTileMap();
    this.decorations = this.add.group();
    this.createDecorations();
    this.enemies = this.add.group();
    this.enemyMeleeTriggers = this.add.group();
    this.pickups = this.add.group();
    this.bullets = this.add.group();
    this.enemyBullets = this.add.group();

    // Initialize blood effect manager
    this.bloodEffectManager = new BloodEffectManager(this);

    this.createPlayer();
    this.createEnemies();
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setLerp(0.1, 0.1);
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight, true, true, true, false);
    this.setupInputs();
    this.setupBaseCollisions();
    this.scene.launch("UIScene", { gameSceneKey: this.scene.key });
  }

  setupBaseCollisions(): void {
    this.setupWorldBounds();
    this.setupGroundCollisions();
    this.setupContactDamage();
    this.setupMeleeCollisions();
    this.setupPickupCollisions();
    this.setupBulletCollisions();
  }

  setupInputs(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shootKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
  }

  setupWorldBounds(): void {
    this.player.setCollideWorldBounds(true);
    this.enemies.children.iterate((enemy: any) => {
      if (enemy && enemy.setCollideWorldBounds) {
        enemy.setCollideWorldBounds(true);
      }
      return true;
    });
  }

  setupGroundCollisions(): void {
    utils.addCollider(this, this.player, this.groundLayer);
    utils.addCollider(this, this.enemies, this.groundLayer);
  }

  setupContactDamage(): void {
    utils.addOverlap(this, this.player, this.enemies, (player: any, enemy: any) => {
      if (!player.isInvulnerable && !player.isDead && !enemy.isDead) {
        const knockbackDir = player.x > enemy.x ? 1 : -1;
        player.setVelocityX(knockbackDir * 200);
        player.setVelocityY(-150);
        player.takeDamage(enemy.contactDamage);
      }
    });
  }

  setupMeleeCollisions(): void {
    // Player attack vs enemies
    utils.addOverlap(this, this.player.meleeTrigger, this.enemies, (trigger: any, enemy: any) => {
      if (this.player.isAttacking && !this.player.currentMeleeTargets.has(enemy)) {
        if (enemy.isHurting || enemy.isDead) return;
        this.player.currentMeleeTargets.add(enemy);
        const knockbackDir = enemy.x > this.player.x ? 1 : -1;
        enemy.setVelocityX(knockbackDir * 150);
        enemy.setVelocityY(-100);

        // Track damage for scoring
        const damageDealt = Math.min(this.player.attackDamage, enemy.health);
        const wasAlive = !enemy.isDead;

        enemy.takeDamage(this.player.attackDamage);

        // Add score for damage dealt
        scoreManager.addDamageScore(damageDealt);

        // If enemy died from this hit, add kill score
        if (wasAlive && enemy.isDead) {
          const enemyType = enemy.constructor.name;
          scoreManager.addEnemyKillScore(enemyType);
        }
      }
    });

    // Enemy attacks vs player
    utils.addOverlap(this, this.enemyMeleeTriggers, this.player, (trigger: any, player: any) => {
      const enemy = trigger.owner;
      if (!enemy || !enemy.isAttacking) return;
      if (!enemy.currentMeleeTargets.has(player)) {
        if (player.isInvulnerable || player.isDead) return;
        enemy.currentMeleeTargets.add(player);
        const knockbackDir = player.x > enemy.x ? 1 : -1;
        player.setVelocityX(knockbackDir * 200);
        player.setVelocityY(-150);
        player.takeDamage(enemy.attackDamage);
      }
    });
  }

  setupPickupCollisions(): void {
    utils.addOverlap(this, this.player, this.pickups, (player: any, pickup: any) => {
      if (pickup.pickupType === "health") {
        player.heal(pickup.pickupValue);
      } else if (pickup.pickupType === "gun") {
        player.equipGun();
      }

      // Add score for collecting pickup
      scoreManager.addPickupScore(pickup.pickupType);

      pickup.collect();
    });
  }

  setupBulletCollisions(): void {
    // Player bullets vs enemies
    utils.addOverlap(this, this.bullets, this.enemies, (bullet: any, enemy: any) => {
      if (enemy.isDead) return;

      // Spawn blood effect
      if (this.bloodEffectManager) {
        const centerY = enemy.y - enemy.body.height / 2;
        this.bloodEffectManager.spawnBlood(enemy.x, centerY, 6, false);
      }

      // Track damage for scoring
      const damageDealt = Math.min(bullet.damage, enemy.health);
      const wasAlive = !enemy.isDead;

      enemy.takeDamage(bullet.damage);

      // Add score for damage dealt
      scoreManager.addDamageScore(damageDealt);

      // If enemy died from this hit, add kill score
      if (wasAlive && enemy.isDead) {
        const enemyType = enemy.constructor.name;
        scoreManager.addEnemyKillScore(enemyType);
      }

      bullet.destroy();
    });

    // Bullets vs ground
    utils.addCollider(this, this.bullets, this.groundLayer, (bullet: any) => {
      bullet.destroy();
    });

    // Enemy bullets vs player
    utils.addOverlap(this, this.enemyBullets, this.player, (bullet: any, player: any) => {
      if (player.isInvulnerable || player.isDead) return;

      // Spawn blood effect
      if (this.bloodEffectManager) {
        const centerY = player.y - player.body.height / 2;
        this.bloodEffectManager.spawnBlood(player.x, centerY, 4, false);
      }

      const knockbackDir = player.x > bullet.x ? 1 : -1;
      player.setVelocityX(knockbackDir * 150);
      player.takeDamage(bullet.damage);
      bullet.destroy();
    });

    // Enemy bullets vs ground
    utils.addCollider(this, this.enemyBullets, this.groundLayer, (bullet: any) => {
      bullet.destroy();
    });
  }

  // Create a health pickup at position
  createHealthPickup(x: number, y: number): Pickup {
    const pickup = new Pickup(this, x, y, "health");
    this.pickups.add(pickup);
    return pickup;
  }

  // Create a gun pickup at position
  createGunPickup(x: number, y: number): Pickup {
    const pickup = new Pickup(this, x, y, "gun");
    this.pickups.add(pickup);
    return pickup;
  }

  baseUpdate(time?: number, delta?: number): void {
    this.player.update(this.cursors, this.spaceKey, this.shootKey);
    this.enemies.children.iterate((enemy: any) => {
      if (enemy && enemy.update) {
        enemy.update();
      }
      return true;
    });

    // Update blood effect particles
    if (this.bloodEffectManager && delta) {
      this.bloodEffectManager.update(time || 0, delta);
    }

    // Update bullets
    this.bullets.children.iterate((bullet: any) => {
      if (bullet && bullet.update) {
        bullet.update();
      }
      return true;
    });

    // Update enemy bullets
    this.enemyBullets.children.iterate((bullet: any) => {
      if (bullet && bullet.update) {
        bullet.update();
      }
      return true;
    });

    this.checkEnemiesDefeated();
  }

  checkEnemiesDefeated(): void {
    const currentEnemyCount = this.enemies.children.entries.filter((enemy: any) => enemy.active).length;
    if (currentEnemyCount === 0 && !this.gameCompleted) {
      this.gameCompleted = true;
      this.sound.play("level_complete", { volume: 0.5 });

      // Add level completion score
      scoreManager.completeLevel(this.scene.key);

      // Save progress
      scoreManager.saveProgress();

      if (LevelManager.isLastLevel(this.scene.key)) {
        // Add game completion bonus
        scoreManager.completeGame();
        scoreManager.saveProgress();
        this.scene.launch("GameCompleteUIScene", { currentLevelKey: this.scene.key });
      } else {
        this.scene.launch("VictoryUIScene", { currentLevelKey: this.scene.key });
      }
    }
  }

  setupMapSize(): void {
    throw new Error("setupMapSize method must be implemented by subclass");
  }

  createPlayer(): void {
    throw new Error("createPlayer method must be implemented by subclass");
  }

  createEnemies(): void {
    throw new Error("createEnemies method must be implemented by subclass");
  }

  createBackground(): void {
    throw new Error("createBackground method must be implemented by subclass");
  }

  createTileMap(): void {
    throw new Error("createTileMap method must be implemented by subclass");
  }

  createDecorations(): void {
    throw new Error("createDecorations method must be implemented by subclass");
  }
}

