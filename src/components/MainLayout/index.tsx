// 更新状态
const updateState = (partialState: Partial<AppState>) => {
  // 防止连接信息丢失
  if (partialState.connection === undefined && state.connection) {
    // 如果新状态中连接是undefined但当前有连接，保留当前连接
    console.log('防止连接丢失:', state.connection);
    partialState.connection = state.connection;
  }
  
  setState(prevState => ({
    ...prevState,
    ...partialState
  }));
  
  // 记录状态变更
  console.log('MainLayout 状态更新:', { 
    连接: partialState.connection ? partialState.connection.id : (state.connection ? state.connection.id : undefined), 
    数据库: partialState.database || state.database, 
    表: partialState.table || state.table 
  });
}; 