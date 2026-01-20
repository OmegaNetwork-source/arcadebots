import Phaser from "phaser";
import FSM from "phaser3-rex-plugins/plugins/fsm.js";
import type { BugEnemy } from "./BugEnemy";

// Custom FSM class for managing enemy states
export class EnemyFSM extends FSM {
  scene: Phaser.Scene;
  enemy: BugEnemy;

  constructor(scene: Phaser.Scene, enemy: BugEnemy) {
    super({
      extend: {
        eventEmitter: new Phaser.Events.EventEmitter(),
      },
    });
    this.scene = scene;
    this.enemy = enemy;
    
    // Use goto to trigger enter_state function
    this.goto("idle");
  }

  // Idle state
  enter_idle(): void {
    this.enemy.setVelocityX(0);
    this.enemy.playAnimation("bug_enemy_idle_anim");
  }

  update_idle(): void {
    if (this.enemy.isDead) return;

    // Check if player is in detection range
    const player = (this.scene as any).player;
    if (player && !player.isDead) {
      const distance = Phaser.Math.Distance.Between(
        this.enemy.x, this.enemy.y,
        player.x, player.y
      );
      
      if (distance < this.enemy.detectionRange) {
        this.goto("chasing");
      } else {
        this.goto("patrolling");
      }
    } else {
      this.goto("patrolling");
    }
  }

  // Patrolling state
  enter_patrolling(): void {
    this.enemy.playAnimation("bug_enemy_walk_anim");
  }

  update_patrolling(): void {
    if (this.enemy.isDead) return;

    // Check if player is in detection range
    const player = (this.scene as any).player;
    if (player && !player.isDead) {
      const distance = Phaser.Math.Distance.Between(
        this.enemy.x, this.enemy.y,
        player.x, player.y
      );
      
      if (distance < this.enemy.detectionRange) {
        this.goto("chasing");
        return;
      }
    }

    // Move in facing direction
    if (this.enemy.facingDirection === "right") {
      this.enemy.setVelocityX(this.enemy.walkSpeed);
    } else {
      this.enemy.setVelocityX(-this.enemy.walkSpeed);
    }

    // Update sprite flip
    this.enemy.setFlipX(this.enemy.facingDirection === "left");

    // Check for cliff edge to avoid falling
    this.checkCliffEdge();

    // Random direction change with debounce
    const now = this.scene.time.now;
    if (now - this.enemy.lastDirectionChangeTime > this.enemy.directionChangeDelay) {
      if (Math.random() < 0.01) {
        this.enemy.facingDirection = this.enemy.facingDirection === "right" ? "left" : "right";
        this.enemy.lastDirectionChangeTime = now;
      }
    }
  }

  // Chasing state
  enter_chasing(): void {
    this.enemy.playAnimation("bug_enemy_walk_anim");
  }

  update_chasing(): void {
    if (this.enemy.isDead) return;

    const player = (this.scene as any).player;
    if (!player || player.isDead) {
      this.goto("patrolling");
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.enemy.x, this.enemy.y,
      player.x, player.y
    );

    // If player out of range, go back to patrolling
    if (distance > this.enemy.detectionRange * 1.5) {
      this.goto("patrolling");
      return;
    }

    // Face the player
    const now = this.scene.time.now;
    if (now - this.enemy.lastDirectionChangeTime > this.enemy.directionChangeDelay) {
      if (player.x < this.enemy.x) {
        this.enemy.facingDirection = "left";
      } else {
        this.enemy.facingDirection = "right";
      }
      this.enemy.lastDirectionChangeTime = now;
    }
    this.enemy.setFlipX(this.enemy.facingDirection === "left");

    // Move towards player
    if (this.enemy.facingDirection === "right") {
      this.enemy.setVelocityX(this.enemy.walkSpeed * 1.2);
    } else {
      this.enemy.setVelocityX(-this.enemy.walkSpeed * 1.2);
    }

    // Check if close enough to attack
    if (distance < this.enemy.attackRange * 1.5 && this.enemy.canAttack()) {
      this.goto("attacking");
    }

    // Check for cliff edge
    this.checkCliffEdge();
  }

  // Attack state
  enter_attacking(): void {
    this.enemy.isAttacking = true;
    this.enemy.setVelocityX(0);
    this.enemy.playAnimation("bug_enemy_attack_anim");
    this.enemy.attackSound?.play();
    this.enemy.currentMeleeTargets.clear();
    this.enemy.lastAttackTime = this.scene.time.now;

    // State transition after attack animation completes
    this.enemy.once('animationcomplete-bug_enemy_attack_anim', () => {
      this.enemy.isAttacking = false;
      this.enemy.currentMeleeTargets.clear();
      
      if (!this.enemy.isDead) {
        this.goto("chasing");
      }
    });
  }

  update_attacking(): void {
    if (this.enemy.isDead) {
      this.goto("dying");
    }
    // Keep still during attack
    this.enemy.setVelocityX(0);
  }

  // Hurt state
  enter_hurting(): void {
    this.enemy.setVelocityX(0);
    this.enemy.hurtSound?.play();

    // Brief stun
    this.scene.time.delayedCall(200, () => {
      this.enemy.isHurting = false;
      if (!this.enemy.isDead) {
        this.goto("chasing");
      }
    });
  }

  // Death state
  enter_dying(): void {
    this.enemy.setVelocityX(0);
    this.enemy.dieSound?.play();
    this.enemy.playAnimation("bug_enemy_die_anim");

    // Destroy after death animation
    this.enemy.once('animationcomplete-bug_enemy_die_anim', () => {
      this.enemy.meleeTrigger?.destroy();
      this.enemy.destroy();
    });
  }

  // Helper method to check for cliff edges
  private checkCliffEdge(): void {
    const groundLayer = (this.scene as any).groundLayer;
    if (groundLayer && this.enemy.body.blocked.down) {
      // Calculate check position in front of the enemy
      const checkDistance = 32;
      const checkX = this.enemy.facingDirection === "right" 
        ? this.enemy.x + this.enemy.body.width / 2 + checkDistance 
        : this.enemy.x - this.enemy.body.width / 2 - checkDistance;
      const checkY = this.enemy.y + 10;

      // Convert to tile coordinates
      const tileX = groundLayer.worldToTileX(checkX);
      const tileY = groundLayer.worldToTileY(checkY);

      // Check if there's a tile ahead
      const tile = groundLayer.getTileAt(tileX, tileY);
      
      // If no tile ahead (cliff edge), turn around
      if (!tile || tile.index === -1) {
        this.enemy.facingDirection = this.enemy.facingDirection === "right" ? "left" : "right";
        this.enemy.lastDirectionChangeTime = this.scene.time.now;
      }
    }
  }
}
