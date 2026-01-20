import Phaser from "phaser";
import FSM from "phaser3-rex-plugins/plugins/fsm.js";
import type { SlimeCrawler } from "./SlimeCrawler";

// Custom FSM class for managing Slime Crawler enemy states
export class SlimeCrawlerFSM extends FSM {
  scene: Phaser.Scene;
  slime: SlimeCrawler;

  constructor(scene: Phaser.Scene, slime: SlimeCrawler) {
    super({
      extend: {
        eventEmitter: new Phaser.Events.EventEmitter(),
      },
    });
    this.scene = scene;
    this.slime = slime;

    // Start in idle state
    this.goto("idle");
  }

  // Get player reference
  getPlayer(): any {
    return (this.scene as any).player;
  }

  // Calculate distance to player
  getDistanceToPlayer(): number {
    const player = this.getPlayer();
    if (!player) return Infinity;
    return Phaser.Math.Distance.Between(this.slime.x, this.slime.y, player.x, player.y);
  }

  // Idle state - stay still
  enter_idle() {
    this.slime.setVelocityX(0);
    this.slime.playAnimation("slime_crawler_idle_anim");
  }

  update_idle(time: number, delta: number) {
    const player = this.getPlayer();
    if (!player || player.isDead) return;

    const distance = this.getDistanceToPlayer();
    
    // If player is close, start chasing
    if (distance < this.slime.detectionRange) {
      this.goto("chasing");
    }
  }

  // Chasing state - slowly crawl towards player
  enter_chasing() {
    this.slime.playAnimation("slime_crawler_walk_anim");
  }

  update_chasing(time: number, delta: number) {
    const player = this.getPlayer();
    if (!player || player.isDead) {
      this.goto("idle");
      return;
    }

    const distance = this.getDistanceToPlayer();

    // Update facing direction (with debounce)
    const now = this.scene.time.now;
    if (now - this.slime.lastDirectionChangeTime > this.slime.directionChangeDelay) {
      if (player.x < this.slime.x && this.slime.facingDirection !== "left") {
        this.slime.facingDirection = "left";
        this.slime.lastDirectionChangeTime = now;
      } else if (player.x > this.slime.x && this.slime.facingDirection !== "right") {
        this.slime.facingDirection = "right";
        this.slime.lastDirectionChangeTime = now;
      }
    }
    this.slime.setFlipX(this.slime.facingDirection === "left");

    // Check if can shoot laser (ranged attack has priority when in range)
    if (distance < this.slime.rangedAttackRange && distance > this.slime.attackRange && this.slime.canRangedAttack()) {
      // Stop moving to shoot
      this.slime.setVelocityX(0);
      this.slime.shootLaser();
    } else {
      // Move towards player
      const speed = this.slime.facingDirection === "left" ? -this.slime.walkSpeed : this.slime.walkSpeed;
      this.slime.setVelocityX(speed);
    }

    // Check for cliff edge - don't fall off
    const groundLayer = (this.scene as any).groundLayer;
    if (groundLayer && this.slime.body.onFloor()) {
      const checkDistance = 32;
      const checkX = this.slime.facingDirection === "right" 
        ? this.slime.x + this.slime.body.width / 2 + checkDistance 
        : this.slime.x - this.slime.body.width / 2 - checkDistance;
      const checkY = this.slime.y + 10;

      const tileX = groundLayer.worldToTileX(checkX);
      const tileY = groundLayer.worldToTileY(checkY);
      const tile = groundLayer.getTileAt(tileX, tileY);
      
      if (!tile || tile.index === -1) {
        // Stop at edge but can still shoot
        this.slime.setVelocityX(0);
        
        // If player is in range and can shoot, shoot
        if (distance < this.slime.rangedAttackRange && this.slime.canRangedAttack()) {
          this.slime.shootLaser();
        }
      }
    }

    // If close enough and can attack, attack with melee
    if (distance < this.slime.attackRange && this.slime.canAttack()) {
      this.goto("attacking");
    }

    // If player is too far, go back to idle
    if (distance > this.slime.detectionRange * 1.5) {
      this.goto("idle");
    }
  }

  // Attacking state - lunge attack
  enter_attacking() {
    this.slime.isAttacking = true;
    this.slime.lastAttackTime = this.scene.time.now;
    this.slime.playAnimation("slime_crawler_attack_anim");
    this.slime.attackSound?.play();
    this.slime.currentMeleeTargets.clear();

    // Lunge forward
    const lungeSpeed = this.slime.facingDirection === "left" ? -200 : 200;
    this.slime.setVelocityX(lungeSpeed);
    this.slime.setVelocityY(-100);

    // End attack after animation
    this.slime.once("animationcomplete-slime_crawler_attack_anim", () => {
      this.slime.isAttacking = false;
      this.slime.currentMeleeTargets.clear();
      
      const player = this.getPlayer();
      if (player && !player.isDead && this.getDistanceToPlayer() < this.slime.detectionRange) {
        this.goto("chasing");
      } else {
        this.goto("idle");
      }
    });
  }

  update_attacking(time: number, delta: number) {
    // Keep attacking momentum
  }

  // Hurting state
  enter_hurting() {
    this.slime.setVelocityX(0);
    this.slime.hurtSound?.play();

    // Brief stun - slimes are slow to recover
    this.scene.time.delayedCall(300, () => {
      if (!this.slime.isDead) {
        this.slime.isHurting = false;
        const player = this.getPlayer();
        if (player && !player.isDead && this.getDistanceToPlayer() < this.slime.detectionRange) {
          this.goto("chasing");
        } else {
          this.goto("idle");
        }
      }
    });
  }

  // Dying state
  enter_dying() {
    this.slime.setVelocityX(0);
    this.slime.playAnimation("slime_crawler_die_anim");
    this.slime.dieSound?.play();

    // Destroy after animation
    this.slime.once("animationcomplete-slime_crawler_die_anim", () => {
      this.slime.meleeTrigger.destroy();
      this.slime.destroy();
    });
  }
}
