function getSafeErrorCode(error) {
  return typeof error?.code === 'string' ? error.code : null;
}

function logSafeError(context, error) {
  const errorCode = getSafeErrorCode(error);
  const suffix = errorCode ? ` (code: ${errorCode})` : '';
  console.error(`${context}${suffix}.`);
}

function isDatabaseUnavailable(error) {
  const errorCode = getSafeErrorCode(error);

  return Boolean(
    errorCode &&
      (errorCode === 'ServiceUnavailable' ||
        errorCode === 'SessionExpired' ||
        errorCode.includes('DatabaseUnavailable') ||
        errorCode.includes('NotALeader') ||
        errorCode.includes('Security.'))
  );
}

function sendDatabaseUnavailable(error, context, res) {
  logSafeError(`${context} failed`, error);
  res.status(503).json({
    error: 'Graph database is currently unavailable.',
  });
}

function handleControllerError(error, context, res) {
  if (isDatabaseUnavailable(error)) {
    sendDatabaseUnavailable(error, context, res);
    return;
  }

  logSafeError(`${context} failed unexpectedly`, error);
  res.status(500).json({ error: 'Internal server error.' });
}

module.exports = {
  handleControllerError,
  logSafeError,
  sendDatabaseUnavailable,
};
