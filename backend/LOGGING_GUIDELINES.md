# Logging Guidelines

## Log Levels

Use appropriate log levels based on the severity and purpose of the message:

- **TRACE**: Detailed diagnostic information for debugging complex flows
  - Example: Request/response payloads, detailed state transitions

- **DEBUG**: Diagnostic information useful during development
  - Example: Variable values, function entry/exit, intermediate results

- **INFO**: General informational messages about application progress
  - Example: Task completion, successful operations, progress updates

- **WARNING**: Potentially harmful situations that don't prevent operation
  - Example: Deprecated API usage, fallback to defaults, recoverable errors

- **ERROR**: Error events that might still allow the application to continue
  - Example: Failed operations, caught exceptions, validation failures

- **CRITICAL**: Very severe errors that may cause application termination
  - Example: System failures, unrecoverable errors

## Best Practices

1. **Use structured logging**: Include context in log messages
   ```python
   logger.info(f"Task completed: {task_name}, duration: {duration}s")
   ```

2. **Avoid logging sensitive data**: Never log passwords, tokens, or PII
   ```python
   # Bad
   logger.debug(f"Login with password: {password}")

   # Good
   logger.debug("Login attempt for user")
   ```

3. **Use appropriate log levels**: Don't overuse ERROR for non-critical issues
   ```python
   # Bad
   logger.error("User not found")  # This is expected behavior

   # Good
   logger.warning("User not found, returning 404")
   ```

4. **Include error context**: Log exceptions with traceback when needed
   ```python
   try:
       process_data()
   except Exception as e:
       logger.error(f"Failed to process data: {e}", exc_info=True)
   ```

5. **Be concise but informative**: Provide enough context without verbosity
   ```python
   # Bad
   logger.info("Starting the process of fetching data from the API endpoint")

   # Good
   logger.info("Fetching data from API")
   ```

6. **Use consistent formatting**: Follow a standard format across the codebase
   ```python
   logger.info(f"Operation: {operation}, Status: {status}, Duration: {duration}ms")
   ```

## Naming Conventions

- Use descriptive logger names based on module: `logger = logging.getLogger(__name__)`
- Use lowercase with underscores for log message variables
- Avoid abbreviations unless widely understood
