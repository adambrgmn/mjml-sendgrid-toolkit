import React from 'react';
import { Box, Text } from 'ink';

interface Props {}

const Lint: React.FC<Props> = () => {
  return (
    <Box>
      <Text>In development</Text>
    </Box>
  );
};

Lint.propTypes = {};

export default Lint;
