let skillName = this.effect.name.substring(this.effect.name.indexOf("[") + 1, this.effect.name.indexOf("]"));
return args.skill?.name == skillName;