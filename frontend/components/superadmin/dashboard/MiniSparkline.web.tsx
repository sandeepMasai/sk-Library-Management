import React from 'react';
import { View } from 'react-native';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

type Props = {
  values: number[];
  stroke?: string;
  height?: number;
  width?: number;
};

/** Web: Recharts area sparkline */
export function MiniSparkline({ values, stroke = '#6366F1', height = 40 }: Props) {
  const data = values.map((v, i) => ({ i, v }));
  const fill = stroke.startsWith('rgba') ? stroke.replace(/[\d.]+\)$/, '0.25)') : `${stroke}40`;

  return (
    <View style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            fill={fill}
            strokeWidth={2}
            isAnimationActive
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </View>
  );
}
