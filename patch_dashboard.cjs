const fs = require('fs');
let code = fs.readFileSync('src/components/CafeLiveDashboard.tsx', 'utf8');

const target = `                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
`;

const replacement = `                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Configurations */}
                {cafe.configurations && (
                  <div className="mt-6 flex flex-col gap-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Live Config Dump</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Device Configurations</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.devices?.map((d: any, i: number) => (
                            <li key={i}>{d.category} - {d.seat_name || d.name} ({d.status})</li>
                          ))}
                          {!cafe.configurations.devices?.length && <li>No device configs</li>}
                        </ul>
                      </div>
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Regular Pricing</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.pricing?.map((p: any, i: number) => (
                            <li key={i}>{p.category}: {p.duration}min / {p.person_count}p = ${"{"}p.price{"}"}</li>
                          ))}
                          {!cafe.configurations.pricing?.length && <li>No pricing configs</li>}
                        </ul>
                      </div>
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Happy Hours</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.happyHours?.map((h: any, i: number) => (
                            <li key={i}>{h.category} {h.start_time || h.startTime}-{h.end_time || h.endTime} ({h.enabled ? 'ON' : 'OFF'})</li>
                          ))}
                          {!cafe.configurations.happyHours?.length && <li>No happy hour schedules</li>}
                        </ul>
                      </div>
                      <div className="bg-black border border-neutral-800 rounded-lg p-3">
                        <h5 className="text-xs font-semibold text-neutral-400 mb-2">Happy Hour Pricing</h5>
                        <ul className="text-[10px] text-neutral-500 space-y-1">
                          {cafe.configurations.happyHoursPricing?.map((hp: any, i: number) => (
                            <li key={i}>{hp.category}: {hp.duration}min / {hp.person_count || hp.personCount}p = ${"{"}hp.price{"}"}</li>
                          ))}
                          {!cafe.configurations.happyHoursPricing?.length && <li>No happy hour pricing</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/CafeLiveDashboard.tsx', code);
console.log("Patched CafeLiveDashboard.tsx");
