import Phaser from "phaser";
import { ArcadeBot } from "../entities/ArcadeBot";
import { CorruptedBoss } from "../entities/CorruptedBoss";
import { BloodEffectManager } from "../effects/BloodEffect";
import { Pickup } from "../entities/Pickup";
import { scoreManager } from "../wallet/ScoreManager";
import * as utils from "../utils";

/**
 * Boss Arena Scene - Final boss fight after the falling sequence
 * Flow: Player lands -> Jetpack appears -> Pick up jetpack -> Instructions shown -> Boss appears
 */
export class BossArenaScene extends Phaser.Scene {
  // Game objects
  public player!: ArcadeBot;
  public boss!: CorruptedBoss;
  public bossHazards!: Phaser.GameObjects.Group;
  public bullets!: Phaser.GameObjects.Group;
  public pickups!: Phaser.GameObjects.Group;

  // Arena dimensions
  public arenaWidth: number = 1152;
  public arenaHeight: number = 768;

  // Ground
  public ground!: Phaser.GameObjects.Rectangle;
  public groundCollider!: Phaser.Physics.Arcade.StaticGroup;

  // Input
  public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  public spaceKey!: Phaser.Input.Keyboard.Key;
  public shootKey!: Phaser.Input.Keyboard.Key;

  // Audio
  public backgroundMusic?: Phaser.Sound.BaseSound;

  // Effects
  public bloodEffectManager!: BloodEffectManager;

  // State phases
  public phase: 'landing' | 'jetpack_pickup' | 'instructions' | 'boss_entrance' | 'battle' | 'complete' = 'landing';
  public battleStarted: boolean = false;
  public battleComplete: boolean = false;

  // Jetpack pickup reference
  public jetpackPickup?: Pickup;

  // Instructions UI
  public instructionsText?: Phaser.GameObjects.DOMElement;

  constructor() {
    super({ key: "BossArenaScene" });
  }

  create(): void {
    this.phase = 'landing';
    this.battleStarted = false;
    this.battleComplete = false;

    // Create background
    this.createBackground();

    // Create ground
    this.createGround();

    // Create groups
    this.bossHazards = this.add.group();
    this.bullets = this.add.group();
    this.pickups = this.add.group();

    // Initialize blood effect manager
    this.bloodEffectManager = new BloodEffectManager(this);

    // Create player at ground level (spawning from the landing zone)
    // The player starts just above ground and lands naturally
    const groundY = this.arenaHeight - 50; // Ground top
    this.player = new ArcadeBot(this, this.arenaWidth / 4, groundY);
    this.player.setDepth(10); // Ensure player is visible above background elements

    // Debug: Log player creation
    console.log("BossArenaScene: Player created at", this.player.x, this.player.y);

    // Reset player health to full for boss fight
    this.player.health = this.player.maxHealth;

    // Setup input
    this.setupInputs();

    // Setup collisions
    this.setupCollisions();

    // Setup boss events
    this.setupBossEvents();

    // Launch boss UI (hidden initially, will show boss health when boss appears)
    this.scene.launch("BossUIScene", { bossSceneKey: this.scene.key, hideInitially: true });

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Immediately start the landing flow since player is on ground
    this.time.delayedCall(500, () => {
      this.onPlayerLanded();
    });
  }

  createBackground(): void {
    // Create boss arena background
    const bg = this.add.image(this.arenaWidth / 2, this.arenaHeight / 2, "boss_arena_background");
    utils.initScale(bg, { x: 0.5, y: 0.5 }, this.arenaWidth, this.arenaHeight);
    bg.setDepth(-100);

    // Note: Removed vignette overlay as it was potentially interfering with visibility
  }

  createGround(): void {
    // Create ground using static physics group
    this.groundCollider = this.physics.add.staticGroup();

    // Ground platform
    const groundY = this.arenaHeight - 50;
    const groundRect = this.add.rectangle(
      this.arenaWidth / 2,
      groundY,
      this.arenaWidth,
      100,
      0x2d1f1a
    );
    groundRect.setOrigin(0.5, 0);
    this.physics.add.existing(groundRect, true);
    this.groundCollider.add(groundRect);

    // Add some visual detail to ground
    const groundTop = this.add.rectangle(
      this.arenaWidth / 2,
      groundY,
      this.arenaWidth,
      10,
      0x4a3830
    );
    groundTop.setOrigin(0.5, 0);
    groundTop.setDepth(1);
  }

  // Called when player lands on ground (now called directly since player starts on ground)
  onPlayerLanded(): void {
    if (this.phase !== 'landing') return;

    this.phase = 'jetpack_pickup';

    // Player plays idle animation
    this.player.setVelocity(0, 0);
    this.player.playAnimation(this.player.getAnimKey('idle'));

    // After a brief moment, spawn the jetpack
    this.time.delayedCall(300, () => {
      this.spawnJetpackPickup();
    });
  }

  // Spawn jetpack pickup with dramatic effect
  spawnJetpackPickup(): void {
    // Create jetpack at a position near the player
    this.jetpackPickup = new Pickup(this, this.player.x + 150, this.arenaHeight - 120, "jetpack");
    this.pickups.add(this.jetpackPickup);

    // Make it appear with a flash effect
    this.jetpackPickup.setAlpha(0);
    this.tweens.add({
      targets: this.jetpackPickup,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });

    // Play pickup appear sound
    this.sound.play("weapon_pickup", { volume: 0.3 });

    // Setup pickup collision
    utils.addOverlap(this, this.player, this.pickups, (player: any, pickup: any) => {
      if (pickup.pickupType === "jetpack" && this.phase === 'jetpack_pickup') {
        player.equipJetpack();
        this.sound.play("jetpack_pickup_sound", { volume: 0.5 });
        pickup.collect();
        this.onJetpackPickedUp();
      } else if (pickup.pickupType === "health") {
        player.heal(pickup.pickupValue);
        pickup.collect();
      }
    });
  }

  // Called when player picks up jetpack
  onJetpackPickedUp(): void {
    this.phase = 'instructions';

    // Show instructions text
    this.showInstructions();
  }

  // Show jetpack instructions
  showInstructions(): void {
    const instructionsHTML = `
      <div id="jetpack-instructions" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] flex justify-center items-center">
        <div class="game-pixel-container-gray-800 px-8 py-6 text-center" style="background-color: rgba(0, 0, 0, 0.85); border: 3px solid #4a3830; border-radius: 8px;">
          <div class="text-cyan-400 text-2xl font-bold mb-4" style="text-shadow: 2px 2px 0px #000; font-family: 'RetroPixel', monospace;">
            JETPACK ACQUIRED!
          </div>
          <div class="text-white text-lg mb-4" style="text-shadow: 1px 1px 0px #000; font-family: 'RetroPixel', monospace;">
            Hold <span class="text-yellow-400">UP ARROW</span> to fly
          </div>
          <div class="text-gray-400 text-sm" style="text-shadow: 1px 1px 0px #000; font-family: 'RetroPixel', monospace;">
            Fuel recharges when on ground
          </div>
          <div class="text-yellow-300 text-lg mt-6 animate-pulse" style="text-shadow: 1px 1px 0px #000; font-family: 'RetroPixel', monospace;">
            Press ENTER to continue
          </div>
        </div>
      </div>
    `;

    this.instructionsText = utils.initUIDom(this, instructionsHTML);

    // Wait for player to press enter
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const continueHandler = () => {
      enterKey.off('down', continueHandler);
      this.sound.play("ui_click", { volume: 0.3 });
      this.hideInstructions();
    };
    enterKey.on('down', continueHandler);
  }

  // Hide instructions and start boss entrance
  hideInstructions(): void {
    if (this.instructionsText) {
      this.instructionsText.destroy();
      this.instructionsText = undefined;
    }

    this.phase = 'boss_entrance';
    this.startBossEntrance();
  }

  // Boss dramatic entrance
  startBossEntrance(): void {
    // Dramatic screen shake
    this.cameras.main.shake(500, 0.02);

    // Play boss roar
    this.sound.play("boss_roar", { volume: 0.6 });

    // Create boss off-screen to the right
    this.boss = new CorruptedBoss(this, this.arenaWidth + 200, this.arenaHeight - 100);

    // Boss walks in from the right
    this.tweens.add({
      targets: this.boss,
      x: this.arenaWidth - 200,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.onBossEntranceComplete();
      }
    });

    // Setup boss-related collisions
    this.setupBossCollisions();

    // Start background music
    this.backgroundMusic = this.sound.add("boss_battle_theme", {
      volume: 0.6,
      loop: true
    });
    this.backgroundMusic.play();

    // Show boss health bar in UI
    this.events.emit('showBossUI');
  }

  // Called when boss entrance is complete
  onBossEntranceComplete(): void {
    this.phase = 'battle';
    this.battleStarted = true;

    // Boss is now active and will start attacking
    this.boss.isActive = true;
  }

  // Setup boss-specific collisions (called when boss is created)
  setupBossCollisions(): void {
    // Player vs boss (contact damage)
    utils.addOverlap(this, this.player, this.boss, (player: any, boss: any) => {
      if (player.isInvulnerable || player.isDead || boss.isDead || !this.battleStarted) return;

      const knockbackDir = player.x > boss.x ? 1 : -1;
      player.setVelocityX(knockbackDir * 300);
      player.setVelocityY(-200);
      player.takeDamage(boss.contactDamage);
    });

    // Player melee vs boss (only when boss is vulnerable)
    utils.addOverlap(this, this.player.meleeTrigger, this.boss, (trigger: any, boss: any) => {
      if (!this.player.isAttacking || !boss.isVulnerable) return;
      if (this.player.currentMeleeTargets.has(boss)) return;

      this.player.currentMeleeTargets.add(boss);

      // Spawn blood effect
      const centerY = boss.y - boss.body.height / 2;
      this.bloodEffectManager.spawnBlood(boss.x, centerY, 8, false);

      // Track damage for scoring
      const damageDealt = Math.min(this.player.attackDamage, boss.health);
      boss.takeDamage(this.player.attackDamage);

      // Add score for damaging boss
      scoreManager.addDamageScore(damageDealt);

      // Refill jetpack fuel when damaging the boss
      if (this.player.hasJetpack) {
        this.player.jetpackFuel = this.player.maxJetpackFuel;
      }
    });

    // Player bullets vs boss (only when boss is vulnerable)
    utils.addOverlap(this, this.bullets, this.boss, (bullet: any, boss: any) => {
      if (!boss.isVulnerable || boss.isDead) {
        // Bullet bounces off if not vulnerable
        bullet.destroy();
        return;
      }

      // Spawn blood effect
      const centerY = boss.y - boss.body.height / 2;
      this.bloodEffectManager.spawnBlood(boss.x, centerY, 6, false);

      // Track damage for scoring
      const damageDealt = Math.min(bullet.damage, boss.health);
      boss.takeDamage(bullet.damage);

      // Add score for damaging boss
      scoreManager.addDamageScore(damageDealt);

      bullet.destroy();

      // Refill jetpack fuel when damaging the boss
      if (this.player.hasJetpack) {
        this.player.jetpackFuel = this.player.maxJetpackFuel;
      }
    });

    // Boss hazards vs player
    utils.addOverlap(this, this.bossHazards, this.player, (hazard: any, player: any) => {
      if (player.isInvulnerable || player.isDead) return;

      const damage = (hazard as any).damage || 20;

      // Spawn blood effect
      const centerY = player.y - player.body.height / 2;
      this.bloodEffectManager.spawnBlood(player.x, centerY, 4, false);

      // Knockback
      const knockbackDir = player.x > hazard.x ? 1 : -1;
      player.setVelocityX(knockbackDir * 250);
      player.setVelocityY(-150);

      player.takeDamage(damage);

      // Destroy shockwave on hit, laser stays
      if (hazard.texture.key === "shockwave_effect") {
        hazard.destroy();
      }
    });
  }

  setupInputs(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shootKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
  }

  setupCollisions(): void {
    // Player vs ground
    utils.addCollider(this, this.player, this.groundCollider);

    // Bullets vs ground
    utils.addCollider(this, this.bullets, this.groundCollider, (bullet: any) => {
      bullet.destroy();
    });
  }

  setupBossEvents(): void {
    // Boss death event
    this.events.on("bossDead", () => {
      this.onBossDefeated();
    });

    // Boss vulnerable event for UI updates
    this.events.on("bossVulnerable", (isVulnerable: boolean) => {
      // UI will handle this
    });
  }

  update(time: number, delta: number): void {
    if (this.battleComplete) return;

    // During landing phase, player is waiting for the scene to start
    if (this.phase === 'landing') {
      // Play idle animation while waiting
      this.player.playAnimation(this.player.getAnimKey('idle'));
      return;
    }

    // During jetpack_pickup phase, allow basic movement to pick up jetpack
    if (this.phase === 'jetpack_pickup') {
      this.player.update(this.cursors, this.spaceKey, this.shootKey);
      this.keepPlayerInBounds();
      return;
    }

    // During instructions phase, don't update player
    if (this.phase === 'instructions') {
      return;
    }

    // During boss entrance, allow player to move but boss isn't active yet
    if (this.phase === 'boss_entrance') {
      this.player.update(this.cursors, this.spaceKey, this.shootKey);
      this.keepPlayerInBounds();
      return;
    }

    // Battle phase
    if (this.phase === 'battle') {
      // Check player death
      if (this.player.health <= 0 && !this.player.isDead) {
        this.player.isDead = true;
        this.onPlayerDeath();
        return;
      }

      // Update player
      this.player.update(this.cursors, this.spaceKey, this.shootKey);
      this.keepPlayerInBounds();

      // Update boss
      if (this.boss && !this.boss.isDead) {
        this.boss.update(this.player.x);
      }

      // Update blood effects
      this.bloodEffectManager.update(time, delta);

      // Update bullets
      this.bullets.children.iterate((bullet: any) => {
        if (bullet && bullet.update) {
          bullet.update();
        }
        return true;
      });

      // Clean up off-screen hazards
      this.bossHazards.children.iterate((hazard: any) => {
        if (!hazard) return true;
        if (hazard.x < -100 || hazard.x > this.arenaWidth + 100) {
          hazard.destroy();
        }
        return true;
      });
    }
  }

  keepPlayerInBounds(): void {
    if (this.player.x < 50) {
      this.player.x = 50;
    }
    if (this.player.x > this.arenaWidth - 50) {
      this.player.x = this.arenaWidth - 50;
    }
  }

  onPlayerDeath(): void {
    this.battleComplete = true;
    this.phase = 'complete';
    this.backgroundMusic?.stop();

    this.player.setVelocity(0, 0);
    this.player.playAnimation(this.player.getAnimKey('die'));
    this.player.dieSound?.play();

    // Stop boss UI
    this.scene.stop("BossUIScene");

    // Show game over after delay
    this.time.delayedCall(1500, () => {
      this.scene.launch("GameOverUIScene", { currentLevelKey: "BossArenaScene" });
    });
  }

  onBossDefeated(): void {
    this.battleComplete = true;
    this.phase = 'complete';

    // Award big score bonus for defeating the boss!
    scoreManager.addEnemyKillScore('CorruptedBoss');
    scoreManager.completeGame();
    scoreManager.saveProgress();

    // Dramatic slow-mo effect
    this.time.timeScale = 0.3;

    // After a moment, return to normal and celebrate
    this.time.delayedCall(1000, () => {
      this.time.timeScale = 1;

      // Play victory sound
      this.sound.play("level_complete", { volume: 0.5 });

      // Stop boss music
      this.backgroundMusic?.stop();

      // Stop boss UI
      this.scene.stop("BossUIScene");

      // Launch game complete scene
      this.time.delayedCall(2000, () => {
        this.scene.launch("GameCompleteUIScene", { currentLevelKey: "BossArenaScene" });
      });
    });
  }
}
