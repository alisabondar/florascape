"use client";

import { useMemo } from "react";
import {
  buildCalendarEvents,
  buildShoppingList,
  checkNeighbors,
  eventsToIcs,
  SHOPPING_ASSUMPTIONS,
} from "../../lib/garden-plan";
import type { ClimateContext, GardenPlan, Layout } from "../../lib/types";

export function downloadPlantingCalendar(plan: GardenPlan, climate: ClimateContext | null) {
  const ics = eventsToIcs(buildCalendarEvents(plan.plantingGuide, climate));
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "florascape-planting-calendar.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function pairLabel(plants: string[]) {
  return plants.join(" + ");
}

export function NeighborCheck({ layout }: { layout: Layout }) {
  const areas = useMemo(() => checkNeighbors(layout), [layout]);

  return (
    <section className="result-content-section neighbor-section print-section">
      <div className="result-section-heading">
        <span>04</span>
        <div>
          <h2>Neighbor check</h2>
          <p>
            Pairings gardeners commonly recommend or avoid, checked for the plants sharing each area.
            Treat these as guidance, not guarantees.
          </p>
        </div>
      </div>
      {areas.length ? (
        <div className="neighbor-areas">
          {areas.map((area) => (
            <article className="neighbor-area" key={area.bedId}>
              <h3>{area.bedName}</h3>
              <ul>
                {area.conflicts.map((item) => (
                  <li className="neighbor-conflict" key={item.key}>
                    <strong>
                      {item.plants.length === 1
                        ? `Keep ${item.plants[0]} contained.`
                        : `Consider separating ${pairLabel(item.plants)}.`}
                    </strong>{" "}
                    {item.reason}
                  </li>
                ))}
                {area.helpful.map((item) => (
                  <li className="neighbor-helpful" key={item.key}>
                    <strong>{pairLabel(item.plants)} may work well together.</strong> {item.reason}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <p className="neighbor-empty">No commonly noted pairings or conflicts among these plants.</p>
      )}
    </section>
  );
}

const cubicFeet = (value: number) => `${value} cu ft`;

export function ShoppingList({ layout }: { layout: Layout }) {
  const list = useMemo(() => buildShoppingList(layout), [layout]);
  const { soil } = list;
  const bufferPercent = Math.round(SHOPPING_ASSUMPTIONS.germinationBuffer * 100);
  const compostPercent = Math.round(SHOPPING_ASSUMPTIONS.compostShare * 100);

  return (
    <section className="result-content-section shopping-section print-section">
      <div className="result-section-heading">
        <span>05</span>
        <div>
          <h2>Shopping list</h2>
          <p>What to buy for the current layout.</p>
        </div>
      </div>

      <div className="shopping-columns">
        <div>
          <h3>Plants</h3>
          <table className="shopping-table">
            <thead>
              <tr>
                <th scope="col">Plant</th>
                <th scope="col">Buy</th>
                <th scope="col">Target</th>
              </tr>
            </thead>
            <tbody>
              {list.plants.map((item) => (
                <tr key={item.name}>
                  <th scope="row">{item.name}</th>
                  <td>
                    {item.kind === "starts"
                      ? `${item.amount} nursery ${item.amount === 1 ? "start" : "starts"}`
                      : `${item.amount} seeds`}
                  </td>
                  <td>{item.targetQuantity} plants</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3>{soil.inGround ? "Compost top-dressing" : "Soil and compost"}</h3>
          <table className="shopping-table">
            <thead>
              <tr>
                <th scope="col">Area</th>
                {soil.inGround ? null : <th scope="col">Soil mix</th>}
                <th scope="col">{soil.inGround ? "Compost" : "Compost share"}</th>
              </tr>
            </thead>
            <tbody>
              {soil.areas.map((area) => (
                <tr key={area.id}>
                  <th scope="row">
                    {area.name} <span className="shopping-subtle">({area.squareFeet} sq ft)</span>
                  </th>
                  {soil.inGround ? null : <td>{cubicFeet(area.soilMixCubicFeet)}</td>}
                  <td>{cubicFeet(area.compostCubicFeet)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                {soil.inGround ? null : <td>{cubicFeet(soil.totals.soilMixCubicFeet)}</td>}
                <td>{cubicFeet(soil.totals.compostCubicFeet)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="shopping-bags">
            About <strong>{soil.totals.bags}</strong> bags of{" "}
            {soil.inGround ? "compost" : "soil mix"} ({SHOPPING_ASSUMPTIONS.bagCubicFeet} cu ft each).
          </p>
        </div>
      </div>

      <p className="shopping-assumptions">
        Assumptions: seed counts add a {bufferPercent}% germination buffer to the target; transplants
        count one nursery start per plant.{" "}
        {soil.inGround
          ? `In-ground areas get a ${SHOPPING_ASSUMPTIONS.topDressingInches}-inch compost top-dressing.`
          : `Raised beds and containers are filled ${SHOPPING_ASSUMPTIONS.raisedBedDepthFt} ft deep, with about ${compostPercent}% of the mix as compost (included in the soil-mix volume).`}{" "}
        Bag sizes vary, so check the label.
      </p>
    </section>
  );
}
