// Exercise library.
// Each row: [name, group, pattern, tier (1–5), equipment, muscles, coaching note]
// To add an exercise, copy a row and edit it. Keep names unique: the app uses
// the name to remember stars and "Last time" sets.

export const EXERCISES = [
  ["Pull-up / chin-up","Back","Pull",1,"Pull-up bar","Lats, biceps, mid-back","Best lat builder if you can do 5+ clean reps. Use pulldown until then."],
  ["Lat pulldown (wide or neutral grip)","Back","Pull",1,"Lat machine","Lats (width), biceps","Drive elbows down to your sides, full stretch at top."],
  ["Chest-supported dumbbell row","Back","Pull",1,"Incline bench, dumbbells","Mid-back, lats, rear delts","No lower-back fatigue, so it pairs well with leg days."],
  ["Seated cable row (close grip)","Back","Pull",2,"Cable / row station","Mid-back, lats","Pause with shoulder blades squeezed."],
  ["Single-arm cable pulldown","Back","Pull",2,"Cable machine","Lats","Big stretch per side, good for evening out left/right."],
  ["One-arm dumbbell row","Back","Pull",2,"Bench, dumbbell","Lats, mid-back","Pull toward the hip for more lat."],
  ["Straight-arm cable pulldown","Back","Pull",3,"Cable, bar or rope","Lats (isolation)","Pre-exhaust or finisher, no biceps involved."],
  ["Barbell bent-over row","Back","Pull",3,"Olympic barbell","Upper and mid-back","Heavy, but taxes the lower back. Skip on RDL days."],
  ["Wide-grip cable row (elbows flared)","Back","Pull",3,"Cable / row station","Upper back, rear delts, traps","Shifts the row toward upper-back width."],
  ["Inverted row","Back","Pull",4,"Barbell in squat rack","Mid-back, rear delts","Bodyweight row; lower the bar to make it harder."],
  ["Barbell or dumbbell shrug","Back","Pull",2,"Barbell / dumbbells","Upper traps","Builds the shelf a back squat sits on. Heavy, 1-2 s pause at the top, 8-15 reps."],
  ["Rowing machine intervals","Back","Pull",5,"Rowing machine","Back, legs (conditioning)","Conditioning, not a muscle builder. Overlaps your endurance work."],
  ["Incline dumbbell press","Chest","Push",1,"Incline bench, dumbbells","Upper chest, front delts, triceps","Most shoulder-friendly main press."],
  ["Flat barbell bench press","Chest","Push",2,"Bench press, barbell","Chest, triceps, front delts","Heaviest press; use safeties or a spotter."],
  ["Flat dumbbell press","Chest","Push",2,"Flat bench, dumbbells","Chest, triceps","Deeper stretch than barbell."],
  ["Incline barbell bench press","Chest","Push",3,"Adjustable bench, barbell, rack","Upper chest, front delts","Alternative to incline DB press."],
  ["Cable fly (high-to-low or low-to-high)","Chest","Push",3,"Cable machine","Chest (isolation)","Constant tension; good finisher."],
  ["Push-up (weighted or deficit)","Chest","Push",4,"Mat / plates","Chest, triceps, serratus","Finisher or travel option."],
  ["Dumbbell fly","Chest","Push",5,"Flat bench, dumbbells","Chest","Cable fly does the same job better."],
  ["Cable lateral raise","Shoulders","Push",1,"Cable machine","Side delts (width)","Tension at the bottom where dumbbells give none."],
  ["Dumbbell lateral raise (seated or standing)","Shoulders","Push",1,"Dumbbells","Side delts (width)","Light weight, strict, high reps (12-20). Can run 3x a week."],
  ["Seated dumbbell overhead press","Shoulders","Push",2,"Adjustable bench, dumbbells","Front and side delts, triceps","Back support keeps load on the shoulders."],
  ["Face pull","Shoulders","Pull",2,"Cable, rope","Rear delts, rotator cuff, upper back","Pull to the forehead, thumbs back. Supports shoulder health and posture."],
  ["Reverse cable fly / rear-delt fly","Shoulders","Pull",2,"Cable or dumbbells","Rear delts","Rear delts add 3D width from the side and back."],
  ["Standing barbell overhead press","Shoulders","Push",3,"Olympic barbell, rack","Delts, triceps, trunk","Keep load modest and range clean."],
  ["Lean-away or cable Y-raise","Shoulders","Push",3,"Cable machine","Side and rear delts, lower traps","Variety for side delts."],
  ["Cable external rotation","Shoulders","Pull",4,"Cable machine","Rotator cuff (infraspinatus)","Light. Helps the shoulder positions you find hard."],
  ["Wide-grip cable upright row","Shoulders","Pull",4,"Cable, bar","Side delts, traps","Stop at lower-chest height. Skip if it pinches."],
  ["Arnold press","Shoulders","Push",5,"Dumbbells, bench","Front delts","Redundant with overhead press."],
  ["Incline dumbbell curl","Arms","Pull",2,"Incline bench, dumbbells","Biceps (long head)","Arms behind body gives a strong stretch."],
  ["Barbell or dumbbell curl","Arms","Pull",2,"Barbell / dumbbells","Biceps","Easy to progress load."],
  ["Overhead cable triceps extension","Arms","Push",2,"Cable, rope","Triceps (long head)","Long-head stretch; most triceps growth per set."],
  ["Triceps pushdown","Arms","Push",2,"Cable, rope or bar","Triceps","Simple and easy on elbows."],
  ["Hammer curl","Arms","Pull",3,"Dumbbells","Brachialis, forearm, biceps","Adds arm thickness."],
  ["Bayesian cable curl","Arms","Pull",3,"Cable machine","Biceps (long head)","Face away from the stack, arm behind you."],
  ["Skull crusher","Arms","Push",3,"Bench, barbell or dumbbells","Triceps","Lower toward the forehead or behind the head."],
  ["Close-grip bench press","Arms","Push",3,"Bench press, barbell","Triceps, chest","Heavy triceps compound."],
  ["Cable curl","Arms","Pull",4,"Cable machine","Biceps","Swap-in variety."],
  ["Reverse curl / wrist curl","Arms","Pull",5,"Barbell / dumbbells","Forearms","Only if forearms or grip lag."],
  ["Heel-elevated goblet squat","Quads & knees","Push",1,"Dumbbell, plate or wedge","Quads, VMO, glutes","Your main back-squat substitute. Upright torso, knees forward."],
  ["Leg press","Quads & knees","Push",1,"Leg press","Quads, glutes","Heavy quad loading with zero spinal load."],
  ["Front squat","Quads & knees","Push",2,"Barbell, squat rack","Quads, glutes, upper back","Bar sits on the front delts, not your back. Cross-arm grip if wrists are stiff."],
  ["Barbell back squat (working toward)","Quads & knees","Push",4,"Olympic barbell, squat rack","Quads, glutes, adductors","Not needed for leg growth. Goal lift once your traps make a shelf. Squeeze shoulder blades, bar below the bony bump at the base of the neck; a pad or towel is fine meanwhile."],
  ["Bulgarian split squat","Quads & knees","Push",2,"Bench, dumbbells","Quads, glutes","Brutal but effective single-leg work."],
  ["Knees-over-toes / ATG split squat","Quads & knees","Push",2,"Dumbbells, optional step","Quads, knee tendons","Progress depth gradually for knee resilience."],
  ["Leg extension","Quads & knees","Push",2,"Leg extension machine","Quads (rectus femoris)","Only machine that trains the rectus femoris fully. Full lockout."],
  ["Dumbbell walking lunge","Quads & knees","Push",3,"Dumbbells","Quads, glutes, adductors","Longer steps shift work to glutes."],
  ["Step-up","Quads & knees","Push",3,"Bench or box, dumbbells","Quads, glutes","Run-specific single-leg strength."],
  ["Poliquin / petersen step-up","Quads & knees","Push",4,"Plate or low step","VMO, knee","Heel raised, knee travels forward. Light rehab-style."],
  ["Terminal knee extension","Quads & knees","Push",4,"Cable machine","VMO, knee","Cable behind the knee, straighten fully. Warm-up or rehab."],
  ["Romanian deadlift","Glutes & hamstrings","Pull",1,"Olympic barbell or dumbbells","Hamstrings, glutes, spinal erectors","Bar stays in your hands; no back loading."],
  ["Seated or lying leg curl","Glutes & hamstrings","Pull",1,"Leg curl machine","Hamstrings (knee flexion)","RDLs miss knee flexion; this covers it. Seated version gives more stretch."],
  ["Barbell hip thrust","Glutes & hamstrings","Push",2,"Barbell, bench, pad","Glutes","Bar rests on the hips. Pad it."],
  ["Conventional deadlift","Glutes & hamstrings","Pull",3,"Olympic barbell","Whole posterior chain","High fatigue per set. RDL usually gives more growth per unit of recovery."],
  ["Single-leg dumbbell RDL","Glutes & hamstrings","Pull",3,"Dumbbell","Hamstrings, glutes, balance","Good for runners and hip stability."],
  ["Cable pull-through","Glutes & hamstrings","Pull",3,"Cable, rope","Glutes, hamstrings","Teaches the hinge with very low back stress."],
  ["Nordic curl (assisted)","Glutes & hamstrings","Pull",4,"Mat, anchor under a pad","Hamstrings (eccentric)","Strong evidence for hamstring-injury reduction. Start with partial range."],
  ["Single-leg glute bridge","Glutes & hamstrings","Push",5,"Mat","Glutes","Warm-up level; hip thrust covers it."],
  ["Hip adductor machine","Hips","Neutral",3,"Adductor machine","Adductors (inner thigh)","Adductors are big muscles and help squat depth."],
  ["Hip abductor machine","Hips","Neutral",4,"Abductor machine","Glute med","Hip and knee stability for running."],
  ["Copenhagen plank","Hips","Neutral",4,"Bench, mat","Adductors, obliques","Start with knee on bench, not foot."],
  ["Standing calf raise (on leg press)","Calves & shins","Push",3,"Leg press","Calves (gastrocnemius)","Full stretch at the bottom, pause."],
  ["Tibialis raise","Calves & shins","Neutral",3,"Wall or plate","Tibialis anterior","Shin and knee resilience; helps running."],
  ["Seated calf raise (dumbbell on knees)","Calves & shins","Push",4,"Bench, dumbbell","Calves (soleus)","Soleus does most of the work when running."],
  ["Hanging knee or leg raise","Core","Neutral",2,"Pull-up bar","Lower abs, hip flexors","Curl the pelvis up, don't just swing legs."],
  ["Cable crunch","Core","Neutral",3,"Cable, rope","Abs (rectus abdominis)","Loadable, so it can actually build abs."],
  ["Pallof press","Core","Neutral",3,"Cable machine","Obliques, anti-rotation","Good for swim and run stability."],
  ["Dead bug","Core","Neutral",3,"Mat","Deep core, anti-extension","Low back stays flat on the floor."],
  ["Decline crunch","Core","Neutral",4,"Abs bench","Abs","Hold a plate to progress."],
  ["Plank / side plank","Core","Neutral",5,"Mat","Trunk (isometric)","Easy to over-hold; use harder variations instead of longer holds."]
];

// Order the muscle groups appear in the catalog.
export const GROUP_ORDER = [
  "Back", "Chest", "Shoulders", "Arms", "Quads & knees",
  "Glutes & hamstrings", "Hips", "Calves & shins", "Core"
];

// Exercises that start as "Bodyweight" when added to a session.
// Everything else starts as "Weighted". You can change it per session.
// (If you've done the exercise before, the app reuses the load type you used last time.)
export const BODYWEIGHT_DEFAULTS = [
  "Pull-up / chin-up",
  "Push-up (weighted or deficit)",
  "Dead bug",
  "Plank / side plank",
  "Inverted row",
  "Hanging knee or leg raise",
  "Nordic curl (assisted)",
  "Copenhagen plank",
  "Single-leg glute bridge",
  "Tibialis raise"
];
