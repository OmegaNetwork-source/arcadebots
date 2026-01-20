import Phaser from "phaser";
import FSM from "phaser3-rex-plugins/plugins/fsm.js";
import type { FlyingBat } from "./FlyingBat";

// Custom FSM class for managing Flying Bat enemy states
export class FlyingBatFSM extends FSM {
  scene: Phaser.Scene;
  bat: FlyingBat;
  hoverTimer: number;
  hoverOffset: number;

  constructor(scene: Phaser.Scene, bat: FlyingBat) {
    super({
      extend: {
        eventEmitter: new Phaser.Events.EventEmitter(),
      },
    });
    this.scene = scene;
    this.bat = bat;
    this.hoverTimer = 0;
    this.hoverOffset = 0;

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
    return Phaser.Math.Distance.Between(this.bat.x, this.bat.y, player.x, player.y);
  }

  // Idle state - hover in place with slight bobbing motion
  enter_idle() {
    this.bat.setVelocity(0, 0);
    this.bat.playAnimation("flying_bat_idle_anim");
    this.hoverTimer = 0;
  }

  update_idle(time: number, delta: number) {
    // Hover bobbing motion
    this.hoverTimer += 0.05;
    this.hoverOffset = Math.sin(this.hoverTimer) * 20;
    this.bat.y = this.bat.homeY + this.hoverOffset;

    // Check for player
    const player = this.getPlayer();
    if (!player || player.isDead) return;

    const distance = this.getDistanceToPlayer();
    
    // If player is close enough, start chasing
    if (distance < this.bat.detectionRange) {
      this.goto("chasing");
    }
  }

  // Chasing state - fly towards player
  enter_chasing() {
    this.bat.playAnimation("flying_bat_idle_anim");
  }

  update_chasing(time: number, delta: number) {
    const player = this.getPlayer();
    if (!player || player.isDead) {
      this.goto("idle");
      return;
    }

    const distance = this.getDistanceToPlayer();

    // Face the player
    if (player.x < this.bat.x) {
      this.bat.facingDirection = "left";
    } else {
      this.bat.facingDirection = "right";
    }
    this.bat.setFlipX(this.bat.facingDirection === "left");

    // Move towards player
    const angle = Phaser.Math.Angle.Between(this.bat.x, this.bat.y, player.x, player.y - 30);
    this.bat.setVelocity(
      Math.cos(angle) * this.bat.flySpeed,
      Math.sin(angle) * this.bat.flySpeed
    );

    // If close enough and can attack, attack
    if (distance < this.bat.attackRange && this.bat.canAttack()) {
      this.goto("attacking");
    }

    // If player is too far, go back to idle
    if (distance > this.bat.detectionRange * 1.5) {
      this.goto("returning");
    }
  }

  // Returning state - fly back to home position
  enter_returning() {
    this.bat.playAnimation("flying_bat_idle_anim");
  }

  update_returning(time: number, delta: number) {
    const distanceToHome = Phaser.Math.Distance.Between(this.bat.x, this.bat.y, this.bat.x, this.bat.homeY);
    
    // Face direction of movement
    if (this.bat.body.velocity.x < 0) {
      this.bat.facingDirection = "left";
    } else if (this.bat.body.velocity.x > 0) {
      this.bat.facingDirection = "right";
    }
    this.bat.setFlipX(this.bat.facingDirection === "left");

    // Move back to home Y
    if (Math.abs(this.bat.y - this.bat.homeY) > 10) {
      const moveY = this.bat.y > this.bat.homeY ? -this.bat.flySpeed : this.bat.flySpeed;
      this.bat.setVelocity(0, moveY);
    } else {
      this.goto("idle");
    }

    // Check for player while returning
    const player = this.getPlayer();
    if (player && !player.isDead) {
      const distance = this.getDistanceToPlayer();
      if (distance < this.bat.detectionRange) {
        this.goto("chasing");
      }
    }
  }

  // Attacking state - swoop attack
  enter_attacking() {
    this.bat.isAttacking = true;
    this.bat.lastAttackTime = this.scene.time.now;
    this.bat.playAnimation("flying_bat_attack_anim");
    this.bat.attackSound?.play();
    this.bat.currentMeleeTargets.clear();

    // Swoop towards player
    const player = this.getPlayer();
    if (player) {
      const angle = Phaser.Math.Angle.Between(this.bat.x, this.bat.y, player.x, player.y);
      this.bat.setVelocity(
        Math.cos(angle) * this.bat.flySpeed * 2,
        Math.sin(angle) * this.bat.flySpeed * 2
      );
    }

    // End attack after animation
    this.bat.once("animationcomplete-flying_bat_attack_anim", () => {
      this.bat.isAttacking = false;
      this.bat.currentMeleeTargets.clear();
      this.goto("returning");
    });
  }

  update_attacking(time: number, delta: number) {
    // Keep swooping
  }

  // Hurting state
  enter_hurting() {
    this.bat.setVelocity(0, 0);
    this.bat.hurtSound?.play();

    // Brief stun
    this.scene.time.delayedCall(200, () => {
      if (!this.bat.isDead) {
        this.bat.isHurting = false;
        this.goto("returning");
      }
    });
  }

  // Dying state
  enter_dying() {
    this.bat.setVelocity(0, 100); // Fall down
    this.bat.body.setAllowGravity(true);
    this.bat.playAnimation("flying_bat_die_anim");
    this.bat.dieSound?.play();

    // Destroy after animation
    this.bat.once("animationcomplete-flying_bat_die_anim", () => {
      this.bat.meleeTrigger.destroy();
      this.bat.destroy();
    });
  }
}
