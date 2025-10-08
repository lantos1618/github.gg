while :; do
  cat agent/prompt.md | \
          claude -p --output-format=stream-json --verbose --dangerously-skip-permissions --model claude-sonnet-4-5 | \
          tee -a .agent/claude_output.jsonl | \
          bun agent/visualize.ts --debug;
  echo -e "===SLEEP===\n===SLEEP===\n"; echo 'looping';
sleep 1;
done

# while inotifywait -e close_write agent/prompt.md; do
#   cat agent/prompt.md | \
#     claude -p --output-format=stream-json --verbose --dangerously-skip-permissions | \
#     tee -a .agent/claude_output.jsonl | \
#     bun agent/visualize.ts --debug
#   echo -e "===SLEEP===\n===SLEEP===\n"; echo 'looping'
# done



# while true; do
#   # Store modification time before
#   BEFORE=$(stat -c %Y agent/prompt.md 2>/dev/null || echo 0)
  
#   cat agent/prompt.md | \
#     claude -p --output-format=stream-json --verbose --dangerously-skip-permissions | \
#     tee -a .agent/claude_output.jsonl | \
#     bun agent/visualize.ts --debug
  
#   # Check if file was modified during execution
#   AFTER=$(stat -c %Y agent/prompt.md 2>/dev/null || echo 0)
  
#   if [ "$AFTER" -eq "$BEFORE" ]; then
#     echo "Prompt unchanged, waiting for external modification..."
#     inotifywait -e close_write agent/prompt.md
#   else
#     echo "Prompt modified by agent, running again..."
#   fi
  
#   echo -e "===SLEEP===\n===SLEEP===\n"; echo 'looping'
# done