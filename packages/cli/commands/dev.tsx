import React from 'react';
import { Box, Text } from 'ink';

interface Props {}

const Dev: React.FC<Props> = () => {
  return (
    <Box>
      <Text>In development</Text>
    </Box>
  );
};

Dev.propTypes = {};

export default Dev;
